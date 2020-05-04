"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ERRO = require("./e-rro");
///-----------------------------------------------------------------------------
var Colors;
(function (Colors) {
    Colors["reset"] = "\u001B[0m";
    Colors["bright"] = "\u001B[1m";
    Colors["dim"] = "\u001B[2m";
    Colors["underscore"] = "\u001B[4m";
    Colors["blink"] = "\u001B[5m";
    Colors["reverse"] = "\u001B[7m";
    Colors["hidden"] = "\u001B[8m";
    Colors["black"] = "\u001B[30m";
    Colors["red"] = "\u001B[31m";
    Colors["green"] = "\u001B[32m";
    Colors["yellow"] = "\u001B[33m";
    Colors["blue"] = "\u001B[34m";
    Colors["magenta"] = "\u001B[35m";
    Colors["cyan"] = "\u001B[36m";
    Colors["white"] = "\u001B[37m";
    Colors["bgBlack"] = "\u001B[40m";
    Colors["bgRed"] = "\u001B[41m";
    Colors["bgGreen"] = "\u001B[42m";
    Colors["bgYellow"] = "\u001B[43m";
    Colors["bgBlue"] = "\u001B[44m";
    Colors["bgMagenta"] = "\u001B[45m";
    Colors["bgCyan"] = "\u001B[46m";
    Colors["bgWhite"] = "\u001B[47m";
})(Colors || (Colors = {}));
;
var ProgState;
(function (ProgState) {
    ProgState[ProgState["root"] = 0] = "root";
    ProgState[ProgState["selectTaxObject"] = 1] = "selectTaxObject";
    ProgState[ProgState["selectRegistrator"] = 2] = "selectRegistrator";
    ProgState[ProgState["getInfo"] = 3] = "getInfo";
    ProgState[ProgState["shiftInfo"] = 4] = "shiftInfo";
    ProgState[ProgState["listShiftDocuments"] = 5] = "listShiftDocuments";
    ProgState[ProgState["viewDoc"] = 6] = "viewDoc";
})(ProgState || (ProgState = {}));
;
let greetings = [];
greetings[ProgState.root] = "3:choose object; 4:chose registrator; 5:show current data; 6:get info; exit";
greetings[ProgState.selectTaxObject] = "select object (0 - return)";
greetings[ProgState.selectRegistrator] = "select registrator (0 - return)";
greetings[ProgState.getInfo] = "1:RRO state; 2:Shifts; 3:Last shift data; exit";
greetings[ProgState.shiftInfo] = "select shift; 0- back to info; exit";
greetings[ProgState.listShiftDocuments] = "select document; 0 - go back; exit";
greetings[ProgState.viewDoc] = "0 - back; exit";
class ConsoleProg {
    constructor() {
        this.state = ProgState.root;
        this.showQuery = false;
    }
    greet(s = null) {
        if (s)
            console.log(s);
        if (this.showQuery) {
            process.stdout.write(greetings[this.state] + "\r\n");
            process.stdout.write(`${Colors.white}enter command: ${Colors.reset}`);
        }
    }
    doCommand(command) {
        switch (this.state) {
            case ProgState.root:
                this.doStateRoot(command);
                break;
            case ProgState.selectTaxObject:
                this.doTaxObject(command);
                break;
            case ProgState.selectRegistrator:
                this.doRegistrator(command);
                break;
            case ProgState.getInfo:
                this.doGetInfo(command);
                break;
            case ProgState.shiftInfo:
                this.doShift(command);
                break;
            case ProgState.listShiftDocuments:
                this.doDocumentInfo(command);
                break;
            default:
                this.greet();
                break;
        }
    }
    redirect(set) {
        this.state = set.state;
        this.showQuery = set.showQuery || true;
        this.doCommand(set.command || "");
    }
    checkNumber(s, max) {
        let u = parseInt(s);
        if (!u || isNaN(u) || u <= 0 || u > max)
            return 0;
        else
            return u;
    }
    proceedTable(command, table, redirect) {
        let u = 0;
        if (command == "-") {
            this.showTable(table);
            this.greet();
        }
        else if (command == "0") {
            u = 0;
            this.redirect(redirect);
        }
        else {
            u = this.checkNumber(command, table.table.length);
            if (u == 0) {
                console.log("Wrong number");
                this.redirect({ state: this.state, command: "-" });
            }
        }
        return u;
    }
    showTable(settings) {
        let headers = (!settings.headers || (settings.headers.length != settings.fields.length)) ? settings.fields : settings.headers;
        let indexed = settings.indexed || true;
        let delim = settings.delim || "\t";
        let str = Colors.magenta + (indexed ? "##" + delim : "");
        let first = "";
        for (let y = 0; y < headers.length; y++) {
            str = str + first + headers[y];
            first = delim;
        }
        str = str + Colors.reset;
        console.log(str);
        for (let i = 0; i < settings.table.length; i++) {
            let item = settings.table[i];
            let ss = Colors.magenta + ((indexed) ? (i + 1) + "." + delim : "") + Colors.green;
            let first = "";
            for (let u = 0; u < settings.fields.length; u++) {
                ss = ss + first + item[settings.fields[u]];
                first = delim;
            }
            ss = ss + Colors.reset;
            console.log(ss);
        }
    }
    showCurrent() {
        console.log(this.taxObjectPresentation(rs.currentTaxObject, "Current tax object: "));
        console.log(this.registratorPresentation(rs.currentRegistrator, "Current registrator: "));
        this.state = ProgState.root;
        this.greet();
    }
    taxObjectPresentation(t, prefix = "", delim = "\t", color = Colors.green) {
        if (t)
            return `${color}${prefix}${t.Name}${delim}${t.Address}${Colors.reset}`;
        else
            return "tax object not selected";
    }
    registratorPresentation(r, prefix = "", delim = "\t", color = Colors.green) {
        if (r)
            return `${color}${prefix}${r.NumLocal}${delim}${r.NumFiscal}${Colors.reset}`;
        else
            return "registrator not selected";
    }
    async doStart() {
        if (await rs.createClient()) {
            console.log(Colors.bgBlue + rs.subject.commonName + Colors.reset);
            this.greet("Tax objects loaded " + rs.objectsList.TaxObjects.length);
            this.redirect({ state: ProgState.root, command: "3", showQuery: false });
        }
        else {
            console.log("objects not loaded");
        }
    }
    async doStateRoot(command) {
        if (command == "3") {
            if (!rs.objectsList) {
                this.greet("Tax objects are not loaded");
            }
            else {
                this.redirect({ state: ProgState.selectTaxObject, command: "-" });
            }
        }
        else if (command == "4") {
            if (!rs.currentTaxObject) {
                this.greet("Tax object is not selected");
            }
            else {
                this.redirect({ state: ProgState.selectRegistrator, command: "-" });
            }
        }
        else if (command == "5")
            this.showCurrent();
        else if (command == "6") {
            this.state = ProgState.getInfo;
            this.showQuery = true;
            this.greet();
        }
        else
            this.greet();
    }
    async doTaxObject(command) {
        let u = this.proceedTable(command, { table: rs.objectsList.TaxObjects, fields: ["Name", "Address"] }, { state: ProgState.root });
        if (u != 0) {
            rs.setTaxObjectById(u - 1);
            console.log(this.taxObjectPresentation(rs.currentTaxObject, "Tax object: "));
            this.redirect({ state: ProgState.root, command: "4" });
        }
    }
    async doRegistrator(command) {
        let u = this.proceedTable(command, { table: rs.currentTaxObject.TransactionsRegistrars, fields: ["NumLocal", "NumFiscal"], headers: ["Num", "Num fical"] }, { state: ProgState.root });
        if (u != 0) {
            await rs.setRegistratorById(u - 1);
            this.showQuery = false;
            this.showCurrent();
            this.redirect({ state: ProgState.root, command: "6" });
        }
    }
    async doGetInfo(command) {
        if (command == "1") {
            console.log(rs.RROState);
            this.greet();
        }
        else if (command == "2") {
            await rs.getShiftsList(new Date(2020, 3, 1), new Date(2020, 3, 30));
            this.redirect({ state: ProgState.shiftInfo, command: "-" });
        }
        else if (command == "3") {
            console.log(rs.lastShiftTotal);
            this.greet();
        }
        else {
            this.greet();
        }
    }
    async doShift(command) {
        let u = this.proceedTable(command, { table: rs.shifts, fields: ["OpenShiftFiscalNum", "Opened", "Closed"], headers: ["Fiscal num", "Opened", "Closed"] }, { state: ProgState.getInfo, command: "-" });
        if (u != 0) {
            await rs.setShiftById(u - 1);
            this.redirect({ state: ProgState.listShiftDocuments, command: "-" });
        }
    }
    async doDocumentInfo(command) {
        let u = this.proceedTable(command, { table: rs.documents, fields: ["NumFiscal", "NumLocal", "DocClass", "CheckDocType", "Revoked"] }, { state: ProgState.listShiftDocuments, command: "-" });
        if (u != 0) {
            await rs.setDocumentById(u - 1);
            console.log(await rs.getDocInfo());
            this.greet();
        }
    }
}
//--------------------------------------
let prog = new ConsoleProg();
process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
    let chunk;
    // Use a loop to make sure we read all available data.
    while ((chunk = process.stdin.read()) !== null) {
        let inText = chunk;
        inText = inText.replace(new RegExp("\\r?\\n", "g"), "");
        if (inText == "exit")
            process.exit(0);
        else
            prog.doCommand(inText);
    }
});
process.stdin.on('end', () => { process.stdout.write('end'); });
let rs = new ERRO.ERROState();
rs.setConnectionSettings("80.91.165.208", 80, "/er/cmd");
rs.setEncodingSettings("./keyfop/Key-6.dat", "./keyfop/8030938.cer");
rs.setPass("tectfom", "personal");
rs.onError = (error) => { console.log(Colors.red + error + Colors.reset); };
prog.doStart();
