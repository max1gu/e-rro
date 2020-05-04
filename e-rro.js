"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const http = require("http");
const url = require("url");
const jkurwa = require("jkurwa");
const gost89 = require("gost89");
//very important import. Don't works without it
require('./rand-shim.js');
//-----------------------------
// copy from agent.js. I could't do it in TS
//let algos=gost89.compat.algos;
// copy from ./lib/http.js. Don't know is it nessary
let query = function (method, toUrl, headers, payload, cb) {
    var parsed = url.parse(toUrl);
    var req = http.request({
        host: parsed.host,
        path: parsed.path,
        headers: headers,
        method: method,
    }, function (res) {
        var chunks = [];
        res.on('data', function (chunk) {
            chunks.push(chunk);
        });
        res.on('end', function () {
            cb(Buffer.concat(chunks));
        });
    });
    req.on('error', function (e) {
        cb(null);
    });
    req.write(payload);
    req.end();
};
;
;
;
;
;
;
;
;
;
;
;
;
;
;
class ERROClient {
    constructor(serverName, serverPort, pathCommand, pass, role, keyPath, certPath) {
        this.serverName = serverName;
        this.serverPort = serverPort;
        this.pathCommand = pathCommand;
        this.pass = pass;
        this.role = role;
        this.keyPath = keyPath;
        this.certPath = certPath;
        this.contentType = "application/octet-stream";
        this.box = null;
    }
    setEncodingSettings(keyPath, certPath) {
        this.keyPath = keyPath;
        this.certPath = certPath;
    }
    setPass(pass, role) {
        this.pass = pass;
        this.role = role;
    }
    async getLocalBox() {
        const param = {
            algo: gost89.compat.algos(),
            query: query,
            keys: []
        };
        param.keys[0] = {
            privPath: this.keyPath,
            password: this.pass,
            certPath: this.certPath
        };
        return new jkurwa.Box(param);
    }
    async loadKeyCert() {
        if (!this.box)
            this.box = await this.getLocalBox();
    }
    async signText(data) {
        let content = Buffer.from(data, 'utf8');
        if (!this.box)
            this.box = await this.getLocalBox();
        let headers = null;
        let pipe = [];
        pipe.push({
            op: 'sign',
            tax: false,
            detached: false,
            role: this.role,
            tsp: false,
        });
        const tb = await this.box.pipe(content, pipe, headers);
        return tb;
    }
    readSignedDataXML(signedData) {
        let res;
        try {
            let message = new jkurwa.models.Message(signedData);
            res = message.info.contentInfo.content.toString();
        }
        catch (e) {
            throw new Error("Error read message." + e);
        }
        return res;
    }
    async textRequest(text) {
        let conf = {
            port: this.serverPort,
            host: this.serverName,
            path: this.pathCommand,
            method: "POST",
            headers: {
                "Content-Type": this.contentType,
                "Content-Length": text.byteLength
            },
        };
        return new Promise((resolve, reject) => {
            let client = http.request(conf, (response) => {
                const chanks = [];
                response.on('data', (chank) => { chanks.push(chank); });
                response.on('end', () => {
                    resolve({
                        statusCode: response.statusCode,
                        statusMessage: response.statusMessage,
                        data: Buffer.concat(chanks),
                    });
                });
            });
            client.write(text);
            client.end();
        });
    }
    async signedRequest(data) {
        let content;
        if (typeof (data) === "string")
            content = data;
        else
            content = JSON.stringify(data);
        let d = await this.signText(content);
        let a = await this.textRequest(d);
        return a;
    }
    async signedRequestToJSON(data, parse = true) {
        let answer = await this.signedRequest(data);
        if (answer.statusCode == 200) {
            if (parse)
                return JSON.parse(answer.data.toString());
            else
                return answer.data;
        }
        else
            return null;
    }
    saveToFile(d, fileName) {
        fs.writeFileSync(fileName, d);
    }
    async getServerState() {
        let q = { Command: "ServerState" };
        let answer = await this.textRequest(Buffer.from(JSON.stringify(q)));
        return answer.statusCode == 200;
    }
    async getObjects() {
        let q = { Command: "Objects" };
        return await this.signedRequestToJSON(q);
    }
    async getRROState(numFiscal, offlineSessionId = "", offlineSeed = "") {
        let q = { Command: "TransactionsRegistrarState",
            NumFiscal: numFiscal,
            OfflineSeed: offlineSeed,
            OfflineSessionId: offlineSessionId };
        return await this.signedRequestToJSON(q);
    }
    async getShiftsFromTo(numFiscal, dateFrom, dateTo) {
        let q = {
            Command: "Shifts",
            NumFiscal: numFiscal,
            From: dateFrom.toISOString(),
            To: dateTo.toISOString()
        };
        return await this.signedRequestToJSON(q);
    }
    async getLastShiftTotals(numFiscal) {
        let q = {
            Command: "LastShiftTotals",
            NumFiscal: numFiscal
        };
        return await this.signedRequestToJSON(q);
    }
    async getDocuments(numFiscal, shiftId, openShiftFiscalNum) {
        let q = {
            Command: "Documents",
            NumFiscal: numFiscal,
            ShiftId: null,
            OpenShiftFiscalNum: null
        };
        if (shiftId)
            q.ShiftId = shiftId;
        else if (openShiftFiscalNum)
            q.OpenShiftFiscalNum = openShiftFiscalNum;
        return await this.signedRequestToJSON(q);
    }
    async getDocInfo(numFiscalRegistrator, docClass, numFiscalDoc) {
        let q = {
            Command: docClass,
            RegistrarNumFiscal: numFiscalRegistrator,
            NumFiscal: numFiscalDoc,
        };
        return this.readSignedDataXML(await this.signedRequestToJSON(q, false));
    }
}
class ERROState {
    constructor() {
        this.erro = null;
        this.serverState = false;
        this.objectsList = null;
        this.currentTaxObject = null;
        this.RROState = null;
        this.shifts = null;
        this.currentShift = null;
        this.documents = null;
        this.currentDocument = null;
        this.subject = null;
    }
    setConnectionSettings(server, serverPort, path) {
        this.serverName = server;
        this.serverPort = serverPort;
        this.pathCommand = path;
    }
    setPass(pass, role) {
        this.role = role;
        this.pass = pass;
    }
    setEncodingSettings(keyPath, certPath) {
        this.keyPath = keyPath;
        this.certPath = certPath;
    }
    setTaxObjectById(i) {
        this.currentTaxObject = this.objectsList.TaxObjects[i];
    }
    async setRegistratorById(i) {
        this.currentRegistrator = this.currentTaxObject.TransactionsRegistrars[i];
        await this.getRROState();
        await this.getLastShiftTotals();
    }
    async setShiftById(i) {
        this.currentShift = this.shifts[i];
        await this.getShiftDocumentsList();
    }
    async setDocumentById(i) {
        this.currentDocument = this.documents[i];
    }
    async createClient() {
        let res = true;
        this.erro = new ERROClient(this.serverName, this.serverPort, this.pathCommand, this.pass, this.role, this.keyPath, this.certPath);
        try {
            this.serverState = await this.erro.getServerState();
            this.objectsList = await this.erro.getObjects();
            await this.erro.loadKeyCert();
            this.subject = this.erro.box.keys[0].cert.subject;
            //console.log(this.erro.box.keys[0].cert.subject);
        }
        catch (error) {
            res = false;
            this.getError(error);
        }
        return res;
    }
    async getRROState() {
        try {
            let d = await this.erro.getRROState(this.currentRegistrator.NumFiscal);
            this.RROState = d;
        }
        catch (error) {
            this.getError(error);
        }
    }
    async getLastShiftTotals() {
        try {
            this.lastShiftTotal = await this.erro.getLastShiftTotals(this.currentRegistrator.NumFiscal);
        }
        catch (e) {
            this.getError(e);
        }
    }
    async getShiftsList(dateFrom, dateTo) {
        try {
            let d = await this.erro.getShiftsFromTo(this.currentRegistrator.NumFiscal, dateFrom, dateTo);
            this.shifts = d.Shifts;
        }
        catch (e) {
            this.shifts = null;
            this.getError(e);
        }
    }
    async getShiftDocumentsList() {
        try {
            let d = await this.erro.getDocuments(this.currentRegistrator.NumFiscal, this.currentShift.ShiftId);
            this.documents = d.Documents;
        }
        catch (e) {
            this.documents = null;
            this.getError(e);
        }
    }
    async getDocInfo() {
        try {
            let d = await this.erro.getDocInfo(this.currentRegistrator.NumFiscal, this.currentDocument.DocClass, this.currentDocument.NumFiscal);
            return d;
        }
        catch (e) {
            this.getError(e);
            return null;
        }
    }
    getError(e) {
        if (this.onError)
            this.onError(e);
    }
}
exports.ERROState = ERROState;
