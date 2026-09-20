// Shared state for the existing classic-script UI; no duplicated state.
    let activeGraphHighlightCols = []; 
    let activeSevenCols = []; 
    let currentBoardData = null;
    let activeR5Filter = null;
    let graphHighlightMode = "vertical";
    let sevenLabelsVisible = true;
    let graph12BirthDay = null;
    let activeGraph12Day = null;
    let activeGraph12Group = null;
    let activeGraph12Filter = "reset";
    let graph12AgeVisible = true;
    let graphGuideRenderFrame = null;
    let sevenPairRenderFrame = null;
    let activeSevenStrengthResults = new Map();
    let allSevenStrengthResults = new Map();
    let mainBoardScale = 100;
    let graph12LayoutScale = 100;
    let layoutScaleRenderFrame = null;
    let mainViewMode = "combined";

    const LAYOUT_SCALE_OPTIONS = [70, 80, 90, 100];


    let databaseSaving = false;
