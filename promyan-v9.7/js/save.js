// Confirmed authenticated Sheet saves and stable retry request IDs.
    function isDatabaseReceipt(receipt, requestId) {
        return receipt && receipt.protocol === DATABASE_PROTOCOL && receipt.ok === true
            && receipt.verified === true && receipt.requestId === requestId
            && ['saved', 'duplicate'].includes(receipt.status)
            && Number.isInteger(receipt.row) && receipt.row >= 2
            && typeof receipt.savedAt === 'string' && Number.isFinite(Date.parse(receipt.savedAt));
    }

    function prepareDatabaseRequest(values) {
        const signature = JSON.stringify(values);
        // Persist the request ID within this tab before sending anything.
        // If storage is unavailable, do not risk an untraceable retry.
        const cachedText = sessionStorage.getItem(DATABASE_SESSION_KEY);
        let cached = null;
        try { cached = cachedText ? JSON.parse(cachedText) : null; } catch { /* replace invalid local state */ }
        if (cached && cached.signature === signature && cached.payload
            && cached.payload.protocol === DATABASE_PROTOCOL
            && /^[a-f0-9-]{36}$/i.test(cached.payload.requestId)
            && ['name','dob','note'].every(key => cached.payload[key] === values[key])
            && Number.isFinite(Date.parse(cached.payload.timestamp))) return cached.payload;
        const payload = {
            protocol: DATABASE_PROTOCOL, action: 'save', requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(), ...values
        };
        sessionStorage.setItem(DATABASE_SESSION_KEY, JSON.stringify({signature, payload}));
        return payload;
    }

    async function saveToDatabase() {
        if (databaseSaving) return;
        const ownerToken = window.PromyanOwner.token();
        if (!ownerToken) return;
        const fields = ['db-name','db-dob','db-note'].map(id => document.getElementById(id));
        if (fields.some(field => !field)) {
            showAppMessage('กรุณาประมวลผลแผนผังก่อนบันทึก', true); return;
        }
        const values = {name:fields[0].value.trim(), dob:fields[1].value.trim(), note:fields[2].value.trim()};
        if (!values.name && !values.dob) {
            showAppMessage('กรุณาระบุชื่อเจ้าชะตาหรือวันเดือนปีเกิดก่อนบันทึก', true);
            fields[0].focus(); return;
        }
        if (values.name.length > 200 || values.dob.length > 200 || values.note.length > 2000) {
            showAppMessage('ชื่อและวันเกิดยาวได้ไม่เกิน 200 ตัวอักษร ข้อมูลประกอบไม่เกิน 2,000 ตัวอักษร', true); return;
        }
        let payload;
        try { payload = prepareDatabaseRequest(values); }
        catch {
            showAppMessage('ยังส่งข้อมูลไม่ได้: เบราว์เซอร์ไม่สามารถเก็บรหัสติดตามในแท็บนี้ โปรดใช้ Chrome หรือ Edge รุ่นปัจจุบัน', true); return;
        }
        databaseSaving = true;
        const button = document.querySelector('.btn-db');
        const originalText = button.textContent;
        button.disabled = true;
        button.setAttribute('aria-busy','true');
        button.textContent = 'กำลังตรวจสอบ…';
        showAppMessage('กำลังตรวจสอบการเชื่อมต่อ Google Sheet');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), DATABASE_TIMEOUT_MS);
        let attemptedWrite = false;
        try {
            // A read-only capability check prevents posting to the old unverified handler.
            const healthUrl = new URL(DATABASE_URL);
            healthUrl.searchParams.set('action','health');
            const healthResponse = await fetch(healthUrl.href, {mode:'cors', credentials:'omit', cache:'no-store', signal:controller.signal});
            if (!healthResponse.ok) throw new Error('health-http');
            const health = await healthResponse.json();
            if (health.protocol !== DATABASE_PROTOCOL || health.ok !== true || health.ready !== true || health.authRequired !== true) {
                showAppMessage('ยังไม่ได้ส่งข้อมูล: ต้องติดตั้งและ Deploy โค้ดยืนยันการบันทึกฝั่ง Google Sheet ก่อน', true);
                return;
            }
            attemptedWrite = true;
            button.textContent = 'กำลังบันทึก…';
            showAppMessage('กำลังบันทึกและรอ Google Sheet ยืนยัน รหัส ' + payload.requestId);
            const response = await fetch(DATABASE_URL, {
                method:'POST', mode:'cors', credentials:'omit', redirect:'follow',
                headers:{'Content-Type':'text/plain;charset=utf-8'},
                body:JSON.stringify({...payload, token:ownerToken}), signal:controller.signal
            });
            if (!response.ok) throw new Error('save-http');
            const receipt = await response.json();
            if (receipt && receipt.protocol === DATABASE_PROTOCOL && receipt.ok === false && receipt.code === 'UNAUTHORIZED') {
                window.PromyanOwner.lock('สิทธิ์หมดอายุ กรุณาเข้าสู่ระบบแล้วบันทึกอีกครั้ง ข้อมูลเดิมยังอยู่');
                return;
            }
            if (!isDatabaseReceipt(receipt, payload.requestId)) throw new Error('unverified-receipt');
            const prefix = receipt.status === 'duplicate' ? 'ยืนยันว่ารายการนี้บันทึกไว้แล้ว' : 'Google Sheet ยืนยันการบันทึกแล้ว';
            showAppMessage(prefix + ' · แถว ' + receipt.row + ' · รหัส ' + receipt.requestId);
        } catch {
            showAppMessage(attemptedWrite
                ? 'ยังยืนยันผลไม่ได้ ข้อมูลอาจถูกบันทึกแล้ว อย่าแก้ข้อมูลก่อนลองใหม่ ระบบจะใช้รหัสเดิมเพื่อป้องกันแถวซ้ำ · รหัส ' + payload.requestId
                : 'ยังไม่ได้ส่งข้อมูล: ตรวจสอบอินเทอร์เน็ต สิทธิ์เข้าถึง และการ Deploy โค้ด Google Sheet', true);
        } finally {
            clearTimeout(timer);
            databaseSaving = false;
            button.disabled = false;
            button.removeAttribute('aria-busy');
            button.textContent = originalText;
        }
    }
