import * as fs from "fs";
import * as http from 'http';
import * as url from 'url';
import * as jkurwa from "jkurwa";
import * as gost89 from "gost89";
import * as encoding from "encoding";

//very important import. Don't works without it
require('./rand-shim.js');


//-----------------------------
// copy from agent.js. I could't do it in TS
//let algos=gost89.compat.algos;

// copy from ./lib/http.js. Don't know is it nessary
let query = function(method, toUrl, headers, payload, cb) {
    var parsed = url.parse(toUrl);
    var req = http.request({
        host:  parsed.host,
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
    req.on('error', function(e) {
        cb(null);
    });
    req.write(payload);
    req.end();
};

//----------------------------------------------------------------------------
//----------------------------------------------------------------------------

export interface CertSubject {
	commonName:string,
 	surname?: string,
 	givenName?: string,
	serialNumber?: string,
	countryName?: string,
	localityName?: string,
}


//----------------------------------------------
interface ReqData {
	statusCode:number;
	statusMessage:string;
	data:Buffer;//string;
}

export interface RequestCommand {
	Command:string
};

//--------------------------
export type RequestServerState=RequestCommand;

//--------------------------
export interface RequestRROState extends RequestCommand {
	NumFiscal:number,//Фіскальний номер РРО
	OfflineSessionId?:string,//Ідентифікатор офлайн сесії, для якої будуть надіслані пакети документів (не обов’язковий)
	OfflineSeed?:string //Секретне число" для обчислення фіскального номера офлайн документа офлайн сесії, для якої будуть надіслані пакети документів (не обов’язковий)
};

export interface ResponseRROState {
    ShiftState:number, //0-зміну не відкрито, 1-зміну відкрито
    ShiftId:number, //Ідентифікатор зміни,
    OpenShiftFiscalNum:string,//Фіскальний номер документа “Відкриття зміни”,
    ZRepPresent:boolean, //Ознака присутності Z-звіту (false/true),
    Name:string, //П.І.Б. оператора, що відкрив зміну,
    IssuerId:number, //Ідентифікатор видавця сертифікату оператора,
    Serial:string, //Серійний номер сертифікату оператора,
    FirstLocalNum:number, //Перший внутрішній номер документа у зміні,
    NextLocalNum:number, //Наступний внутрішній номер документа,
    LastFiscalNum:string, //Останній фіскальний номер документа,
    OfflineSessionId:string, //Ідентифікатор офлайн сесії,
    OfflineSeed:string, //"Секретне число" для обчислення фіскального номера офлайн документа,
    OfflineNextLocalNum:string, //Наступний локальний номер документа в офлайн сесії,
    OfflineSessionDuration:string, //Тривалість офлайн сесії (хвилин),
    OfflineSessionsMonthlyDuration: string //Сумарна тривалість офлайн сесій за поточний місяць (хвилин)
}

//--------------------------
export interface RequestShifts extends RequestCommand {
	NumFiscal:number, //Фіскальний номер РРО
	From: string, //Дата і час початку періоду
	To: string //Дата і час завершення періоду
//Дата і час представлені текстом у форматі ISO 8601 (наприклад, "2018-10-17T01:23:00+03:00" ) або JavaScript (наприклад, "/Date(1539723599000)/"). 
}


export interface ShiftItem {
	ShiftId:number, //Ідентифікатор зміни
    OpenShiftFiscalNum:string, //Фіскальний номер документа “Відкриття зміни”
    Opened:string, //Дата і час відкриття зміни
    OpenName:string, //П.І.Б. оператора, що відкрив зміну
    OpenIssuerId:string, //Ідентифікатор видавця сертифікату оператора
    OpenSerial:string, //Серійний номер сертифікату оператора
    Closed:string, //Дата і час закриття зміни
    CloseName:string, //П.І.Б. оператора, що закрив зміну
    CloseIssuerId:string, //Ідентифікатор видавця сертифікату оператора
    CloseSerial:string, //Серійний номер сертифікату оператора
};

export interface ResponseShifts {
	Shifts:ShiftItem[]
};

//--------------------------
export interface RequestDocuments extends RequestCommand {
	NumFiscal:number, //Фіскальний номер РРО
	ShiftId: number, //Ідентифікатор зміни
	OpenShiftFiscalNum: string //Фіскальний номер документа “Відкриття зміни
}

export interface DocumentItem {
	NumFiscal:string, //Фіскальний номер документа
    NumLocal:number, //Локальний номер документа
    DocClass: string, //Клас документа (“Check”, “ZRep”)
    CheckDocType: string, //Тип чека (“SaleGoods”, …)>,
    Revoked: boolean //Ознака відкликаного документа
};

export interface ResponseDocuments {
	Documents:DocumentItem[];
};

//--------------------------
export interface RequestDocInfo extends RequestCommand {
	RegistrarNumFiscal:number, //Фіскальний номер РРО
	NumFiscal: string //Фіскальний номер чека/Z-звіту
};

//--------------------------
export interface RequestLastShiftTotals extends RequestCommand {
	NumFiscal:number //Фіскальний номер РРО
};


export interface ShiftTotalsPayForm{
	PayFormCode:string,
	PayFormName:string,
	Sum:number
}

export interface ShiftTotalsTax {
	 Type:number,
     Name:string, 
     Letter:string,
     Prc:number, 
     Sign:boolean, 
     Turnover:number,
     Sum:number,
}

export interface ShiftTotalsOrderType {
	Sum:number, //Загальна сума
	TotalCurrencyCommission:number, //Загальна сума комісії від переказів
	OrdersCount:number, //Кількість чеків
	TotalCurrencyCost:number //Кількість операції переказу коштів
	PayForm:ShiftTotalsPayForm[], //Підсумки по формам оплати
	Tax:ShiftTotalsTax[] //Податки/збори
};

export interface ShiftTotals {
	ShiftTotalsOrderType:ShiftTotalsOrderType, //Підсумки реалізації
	//Підсумки повернення
	ServiceInput:number,//Службовий внесок
	ServiceOutput:number//ServiceOutput 
};


export interface ResponseLastShiftTotals {
	ShiftState, //0-зміну не відкрито, 1-зміну відкрито
	ZRepPresent, //Ознака присутності Z-звіту (false/true)
	Totals:ShiftTotals 
};

//--------------------------

export type RequestObjects=RequestCommand;

export interface TransactionsRegistrarItem {
	NumFiscal :number, 
	NumLocal: number
};
export interface TaxObjectItem {
	Address:string,
	Guid:string,
	Name:string,
	Tin:number,
	TransactionsRegistrars:TransactionsRegistrarItem[]
};
export interface ResponseObjects {
	TaxObjects:TaxObjectItem[]
};



class ERROClient {
	private contentType:string="application/octet-stream";
	box:jkurwa.Box=null;

	constructor (
		private serverName:string,
		private serverPort:number,
		private pathCommand:string,
		private pass:string,
		private role:string,
		private keyPath:string,
		private certPath:string
		){
	}

	setEncodingSettings(keyPath:string, certPath:string){
		this.keyPath=keyPath;
		this.certPath=certPath;
	}

	setPass(pass:string,role:string){
		this.pass=pass;
		this.role=role;
	}

	private async getLocalBox():Promise<jkurwa.Box> {
		const param={
			algo:gost89.compat.algos(),
			query:query,
			keys:[]};
			param.keys[0]={
				privPath:this.keyPath,
				password:this.pass,
				certPath:this.certPath
			}
    	return new jkurwa.Box(param);
	}

	async loadKeyCert(){
		if (!this.box) this.box=await this.getLocalBox();
	}

    private async signText(data:string):Promise<Buffer> {
		let content:Buffer=Buffer.from(data,'utf8');
		if (!this.box) this.box=await this.getLocalBox();
		let headers=null;
		let pipe=[];
		pipe.push({
          	op: 'sign',
          	tax: false,
          	detached: false,
          	role: this.role,
          	tsp: false,
        	});
		const tb=await this.box.pipe(content,pipe,headers);
		return tb;
	}

	readSignedDataXML(signedData:Buffer):string{
		let res:string;
		try {
			let message=new jkurwa.models.Message(signedData);
			res=message.info.contentInfo.content.toString();
		} catch(e) {
			throw new Error("Error read message."+e);
		}
		return res;
	}

	private async textRequest(text:Buffer):Promise<ReqData> {

		let conf:http.ClientRequestArgs= {
			port:this.serverPort,
			host:this.serverName,
			path:this.pathCommand,
			method:"POST",
			headers: {
				"Content-Type":this.contentType,
				"Content-Length":text.byteLength},
			}

		return new Promise<ReqData>((resolve,reject) =>{
			let client = http.request(conf, (response:http.IncomingMessage) => {
				const chanks=[];
				response.on('data',(chank)=>{chanks.push(chank);});
				response.on('end',()=>{resolve({
					statusCode:response.statusCode,
					statusMessage:response.statusMessage,
					data:Buffer.concat(chanks),//.toString()
				});});
			});
			client.write(text);
			client.end();
		});
	}



	private async signedRequest(data:string|any):Promise<ReqData> {
		let content:string;
		if (typeof(data)==="string") content=data;
		else content=JSON.stringify(data);
		let d:Buffer=await this.signText(content);
		let a=await this.textRequest(d)
		return a;
	}

	private async signedRequestToJSON(data:any,parse:boolean=true):Promise<any> {
		let answer:ReqData=await this.signedRequest(data);
		if (answer.statusCode==200) {
			if (parse) return JSON.parse(answer.data.toString());
			else return answer.data;
		}
		else return null;
	}

	saveToFile(d:Buffer,fileName:string){
		fs.writeFileSync(fileName,d);
	}

	async getServerState():Promise<boolean> {
		let q:RequestServerState={Command:"ServerState"};
		let answer:ReqData=await this.textRequest(Buffer.from(JSON.stringify(q)));
		return answer.statusCode==200;
	}

	async getObjects():Promise<ResponseObjects> {
		let q:RequestObjects={Command:"Objects"};
		return await this.signedRequestToJSON(q);
	}

	async getRROState(numFiscal:number,offlineSessionId:string="",offlineSeed:string=""):Promise<any>{
		let q:RequestRROState={Command:"TransactionsRegistrarState",
			NumFiscal:numFiscal,
			OfflineSeed:offlineSeed,
			OfflineSessionId:offlineSessionId};
		return await this.signedRequestToJSON(q);
	}

	async getShiftsFromTo(numFiscal:number, dateFrom:Date, dateTo:Date):Promise<any> {
		let q:RequestShifts={
			Command:"Shifts",
			NumFiscal:numFiscal,
			From:dateFrom.toISOString(),
			To:dateTo.toISOString()};
		return await this.signedRequestToJSON(q);
	}

	async getLastShiftTotals(numFiscal:number):Promise<any>{
		let q:RequestLastShiftTotals={
			Command:"LastShiftTotals",
			NumFiscal:numFiscal
		};
		return await this.signedRequestToJSON(q);
	}

	async getDocuments(numFiscal:number,shiftId?:number,openShiftFiscalNum?:string):Promise<any> {
		let q:RequestDocuments={
			Command:"Documents",
			NumFiscal:numFiscal,
			ShiftId:null,
			OpenShiftFiscalNum:null
		};
		if (shiftId) q.ShiftId=shiftId; else if (openShiftFiscalNum) q.OpenShiftFiscalNum=openShiftFiscalNum;
		return await this.signedRequestToJSON(q);
	}

	async getDocInfo(numFiscalRegistrator:number,docClass:string,numFiscalDoc:string):Promise<string> {
		let q:RequestDocInfo={
			Command:docClass,
			RegistrarNumFiscal:numFiscalRegistrator,
			NumFiscal:numFiscalDoc,
		}
		return this.readSignedDataXML(await this.signedRequestToJSON(q,false));
	}


}


type OnErrorEvent = (e:Error) => void;

export class ERROState {
	private serverName:string;
	private serverPort:number;
	private pathCommand:string;

	private pass:string;
	private role:string;
	private keyPath:string;
	private certPath:string;

	private erro:ERROClient=null;
	serverState:boolean=false;
	objectsList:ResponseObjects=null;
 	currentTaxObject:TaxObjectItem=null; 
 	currentRegistrator:TransactionsRegistrarItem;	
 	RROState:ResponseRROState=null;
 	lastShiftTotal:ResponseLastShiftTotals;
 	shifts:ShiftItem[]=null;
 	currentShift:ShiftItem=null;
 	documents:DocumentItem[]=null;
 	currentDocument:DocumentItem=null;
 	subject:CertSubject=null;

 	onError:OnErrorEvent;

 	constructor(){

 	}

 	setConnectionSettings(server:string,serverPort:number,path:string){
 		this.serverName=server;
 		this.serverPort=serverPort;
 		this.pathCommand=path;
 	}

 	setPass(pass:string,role:string){
 		this.role=role;
 		this.pass=pass;
 	}

 	setEncodingSettings(keyPath:string, certPath:string){
 		this.keyPath=keyPath;
 		this.certPath=certPath;
 	}

 	setTaxObjectById(i:number){
 		this.currentTaxObject=this.objectsList.TaxObjects[i];
 	}


  	async setRegistratorById(i:number){
 		this.currentRegistrator=this.currentTaxObject.TransactionsRegistrars[i];
 		await this.getRROState();
 		await this.getLastShiftTotals();
 	}

 	async setShiftById(i:number) {
 		this.currentShift=this.shifts[i];
 		await this.getShiftDocumentsList();
 	}

 	async setDocumentById(i:number) {
 		this.currentDocument=this.documents[i];
 	}

 	async createClient():Promise<boolean>{
 		let res:boolean=true;
 		this.erro=new ERROClient(this.serverName,this.serverPort,this.pathCommand,
 			this.pass,this.role,
 			this.keyPath,this.certPath);
 		try {
 			this.serverState = await this.erro.getServerState();
 			this.objectsList = await this.erro.getObjects();
 			await this.erro.loadKeyCert();
 			this.subject=this.erro.box.keys[0].cert.subject;
 			//console.log(this.erro.box.keys[0].cert.subject);
 		} catch (error) {
 			res=false;
 			this.getError(error);
 		}
 		return res;
 	}

 	
 	async getRROState(){
 		try{
 			let d:ResponseRROState=await this.erro.getRROState(this.currentRegistrator.NumFiscal);
 			this.RROState=d;
 		} catch (error) {this.getError(error)}
	}

	async getLastShiftTotals(){
		try {
			this.lastShiftTotal=await this.erro.getLastShiftTotals(this.currentRegistrator.NumFiscal);
		} catch(e) {this.getError(e);}
	}

	async getShiftsList(dateFrom:Date,dateTo:Date){
		try {
			let d:ResponseShifts=await this.erro.getShiftsFromTo(this.currentRegistrator.NumFiscal,dateFrom,dateTo);
			this.shifts=d.Shifts;
		} catch(e) {
			this.shifts=null;
			this.getError(e);}
	}

	async getShiftDocumentsList(){
		try {
			let d=await this.erro.getDocuments(this.currentRegistrator.NumFiscal,this.currentShift.ShiftId);
			this.documents=d.Documents;
		} catch(e) {
			this.documents=null;
			this.getError(e);
		}
	}

	async getDocInfo():Promise<string>{
		try {
			let d:string=await this.erro.getDocInfo(this.currentRegistrator.NumFiscal,this.currentDocument.DocClass,this.currentDocument.NumFiscal);
			return d;
		} catch (e)	{
			this.getError(e);
			return null;
		}
	}

	private getError(e:Error){
		if (this.onError) this.onError(e);
	}

}

