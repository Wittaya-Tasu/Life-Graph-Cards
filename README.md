# Promyan V9.5 — Owner Login

ส่วนเพิ่มจาก V9.5: หน้า Login ใช้ภาพเจ้าของเดิมและกล่องด้านขวา ตรวจ Username/Password ที่ GAS, session หมดอายุ 8 ชั่วโมง และตรวจสิทธิ์ทุกครั้งก่อนบันทึก พร้อม Logout

สูตรคำนวณ กราฟ ไพ่ คะแนน 7 กลุ่ม การส่งออกภาพ และการตัด Dropdown 22 หัวข้อคงเดิม มีปุ่มออกจากระบบเพิ่มเหนือกระดาน ไม่บังไพ่

## ติดตั้ง

อ่าน `google-apps-script/SETUP.md` ตามลำดับ: ตั้งบัญชีใน GAS → ลบค่ารหัสจากโค้ด → deploy ตัวเดิม → อัปโหลด HTML และ assets/login-teacher.jpg ไป GitHub → ทดสอบจริง

สำรองของเดิมก่อนแทนไฟล์ เก็บ images ไพ่เดิมไว้ ZIP นี้ไม่มีภาพไพ่เดิม

Username และ Password ใน `setupOwnerAccount` **เว้นว่าง** จึงไม่มีบัญชีเริ่มต้นหรือรหัสผ่านสำเร็จรูป ระบบปฏิเสธการ Login/บันทึกจนตั้งบัญชี

## ทดสอบในเครื่อง

ต้องมี Node.js รุ่นปัจจุบันและ npm:

```sh
npm ci
npx playwright install chromium
npm test
npm run test:ui
```

หากใช้ Chromium ที่ติดตั้งแยก กำหนด `PROMYAN_CHROMIUM_PATH` เป็นพาธ executable ก่อนรัน

- `npm test`: สูตร/แผนผัง 1,008 ชุด, บันทึกแบบยืนยันผล, authentication, ค่า PBKDF2 เทียบกับ Node crypto
- `npm run test:ui`: Chromium สองขนาดจอ 1366×768 และ 1920×1080 รวม Login และ regression V9.5
- ชุด Login integration เรียกโค้ด GAS จริงภายใน Node VM โดยจำลองบริการ Google; ไม่ใช่การรันบน Google
- ภาพ Login เป็นภาพแนบจริง ภาพไพ่ใน tests ใช้ภาพจำลอง
- การส่งออก PNG ใช้ html2canvas 1.4.1 จริง
- คำขอ Google ถูก intercept ทั้งหมด จึงไม่เขียนข้อมูลทดสอบลง Sheet จริง

รายละเอียดผลล่าสุดดู `TEST_REPORT.md`

## ไฟล์

| ไฟล์ | จุดประสงค์ |
|---|---|
| promyan_wt_tuksa9.5.html | เว็บเดิมพร้อม Login; URL GAS เดิม |
| assets/login-teacher.jpg | ภาพแนบเดิม ไม่แก้ไขภาพ |
| google-apps-script/Code.gs | GAS รวมระบบบัญชี สิทธิ์ และโค้ดบันทึกเดิม พร้อม SJCL subset |
| google-apps-script/SETUP.md | วิธีตั้งบัญชีและ deploy ทีละขั้น |
| google-apps-script/SJCL-LICENSE.txt | ใบอนุญาตไลบรารี PBKDF2/SHA256 |
| tests/ | ชุดทดสอบจำลองและ UI |
| playwright-report/ | รายงาน UI ที่รันจริงในเครื่องทดสอบ |

หน้า Login ไม่ได้ทำให้ไฟล์บน GitHub เป็นส่วนตัว ขอบเขตนี้เจ้าของยอมรับแล้ว การบันทึกป้องกันด้วยการตรวจ token ฝั่ง GAS ไม่ขึ้นกับการซ่อน UI
