
import * as ERRO from "./e-rro";
///-----------------------------------------------------------------------------

enum Colors {
	reset="\x1b[0m",
	bright="\x1b[1m",
	dim = "\x1b[2m",
	underscore = "\x1b[4m",
	blink = "\x1b[5m",
	reverse = "\x1b[7m",
	hidden = "\x1b[8m",
	black = "\x1b[30m",
	red="\x1b[31m",
	green="\x1b[32m",
	yellow = "\x1b[33m",
	blue = "\x1b[34m",
	magenta = "\x1b[35m",
	cyan = "\x1b[36m",
	white = "\x1b[37m",
	bgBlack = "\x1b[40m",
	bgRed = "\x1b[41m",
	bgGreen = "\x1b[42m",
	bgYellow = "\x1b[43m",
	bgBlue = "\x1b[44m",
	bgMagenta = "\x1b[45m",
	bgCyan = "\x1b[46m",
	bgWhite = "\x1b[47m"
};


enum ProgState {root = 0, selectTaxObject = 1, selectRegistrator = 2, getInfo=3, shiftInfo=4, listShiftDocuments=5, viewDoc=6};

let greetings:string[]=[];
greetings[ProgState.root]="3:choose object; 4:chose registrator; 5:show current data; 6:get info; exit";
greetings[ProgState.selectTaxObject]="select object (0 - return)";
greetings[ProgState.selectRegistrator]="select registrator (0 - return)";
greetings[ProgState.getInfo]="1:RRO state; 2:Shifts; 3:Last shift data; exit";
greetings[ProgState.shiftInfo]="select shift; 0- back to info; exit";
greetings[ProgState.listShiftDocuments]="select document; 0 - go back; exit";
greetings[ProgState.viewDoc]="0 - back; exit";

type TableSettings ={
	table:any[],
	fields:string[],
	headers?:string[],
	delim?:string,
	indexed?:boolean
};

type RedirectSettings={
	state:ProgState,
	command?:string,
	showQuery?:boolean
}

class ConsoleProg {
  state:ProgState=ProgState.root;
  showQuery:boolean=false;

  constructor (){
  	
  }

  greet(s:string=null){
	if (s) console.log(s);
	if (this.showQuery) {
		process.stdout.write(greetings[this.state]+"\r\n");
		process.stdout.write(`${Colors.white}enter command: ${Colors.reset}`);
	}  	
  }

  doCommand(command:string){
  	switch (this.state) {
  		case ProgState.root:this.doStateRoot(command);break;
  		case ProgState.selectTaxObject:this.doTaxObject(command);break;
  		case ProgState.selectRegistrator:this.doRegistrator(command);break;
  		case ProgState.getInfo:this.doGetInfo(command);break;
  		case ProgState.shiftInfo:this.doShift(command);break;
  		case ProgState.listShiftDocuments:this.doDocumentInfo(command);break;
  		default:this.greet();break;
  	}
  }

	redirect(set:RedirectSettings){
		this.state=set.state;
		this.showQuery=set.showQuery||true;
		this.doCommand(set.command||"");
	}


	private checkNumber(s:string,max:number):number {
		let u:number=parseInt(s);
		if (!u || isNaN(u) || u<=0 || u>max) return 0
		else return u;
	}

	private proceedTable(command:string, table:TableSettings,redirect:RedirectSettings):number {
		let u:number=0;
		if (command=="-") {
			this.showTable(table);
			this.greet();
		}
		else if (command=="0") {
			u=0;
			this.redirect(redirect);
		}
		else {
			u=this.checkNumber(command,table.table.length);
			if (u==0) {
					console.log("Wrong number");
					this.redirect({state:this.state,command:"-"});
				}
		}
		return u;
	}

	private showTable(settings:TableSettings){
		let headers:string[]=(!settings.headers || (settings.headers.length!=settings.fields.length))? settings.fields:settings.headers;
		let indexed:boolean=settings.indexed || true;
		let delim:string=settings.delim || "\t";
		
		let str:string=Colors.magenta+(indexed ? "##"+delim:"");
		let first:string="";
		for (let y=0;y<headers.length;y++) {
			str=str+first+headers[y];
			first=delim;
		}
		str=str+Colors.reset;
		console.log(str);
		for (let i=0;i<settings.table.length;i++) {
			let item=settings.table[i];
			let ss:string=Colors.magenta+((indexed)?(i+1)+"."+delim:"")+Colors.green;
			let first:string="";
			for (let u=0;u<settings.fields.length;u++) {
				ss=ss+first+item[settings.fields[u]];
				first=delim;
			}
			ss=ss+Colors.reset;
			console.log(ss);
		}
	}

	private showCurrent(){
		console.log(this.taxObjectPresentation(rs.currentTaxObject,"Current tax object: "));
		console.log(this.registratorPresentation(rs.currentRegistrator,"Current registrator: "));
		this.state=ProgState.root;
		this.greet();
	}

 	private taxObjectPresentation(t:ERRO.TaxObjectItem,prefix:string="",delim:string="\t",color:string=Colors.green):string{
 		if (t) return `${color}${prefix}${t.Name}${delim}${t.Address}${Colors.reset}`;
 		else return "tax object not selected";}

 	private registratorPresentation(r:ERRO.TransactionsRegistrarItem,prefix:string="",delim:string="\t",color:string=Colors.green):string {
 		if (r) return `${color}${prefix}${r.NumLocal}${delim}${r.NumFiscal}${Colors.reset}`;
 		else return "registrator not selected";
 	}  


 	async doStart(){
 		if (await rs.createClient()) {
 			console.log(Colors.bgBlue+rs.subject.commonName+Colors.reset);
			this.greet("Tax objects loaded "+rs.objectsList.TaxObjects.length);
			this.redirect({state:ProgState.root,command:"3",showQuery:false});
		} else {console.log("objects not loaded");}
   	}

  async doStateRoot(command:string) {
	if (command=="3") {
  		if (!rs.objectsList){this.greet("Tax objects are not loaded");}
  		else {
  			this.redirect({state:ProgState.selectTaxObject,command:"-"});
  		}
  	}
  	else if (command=="4") {
		if (!rs.currentTaxObject) {this.greet("Tax object is not selected");}
		else {
			this.redirect({state:ProgState.selectRegistrator,command:"-"});
		}
  	}
  	else if (command=="5") this.showCurrent();
  	else if (command=="6") {this.state=ProgState.getInfo;this.showQuery=true;this.greet();}
  	else this.greet();
	}

	async doTaxObject(command:string) {
		let u=this.proceedTable(command,
			{table:rs.objectsList.TaxObjects,fields:["Name","Address"]},
			{state:ProgState.root});
		if (u!=0) {
			rs.setTaxObjectById(u-1);
			console.log(this.taxObjectPresentation(rs.currentTaxObject,"Tax object: "));
			this.redirect({state:ProgState.root,command:"4"});
		}
	}

	
	async doRegistrator(command:string){
		let u=this.proceedTable(command, 
			{table:rs.currentTaxObject.TransactionsRegistrars,fields:["NumLocal","NumFiscal"],headers:["Num","Num fical"]},
			{state:ProgState.root});
		if (u!=0) {
			await rs.setRegistratorById(u-1);
			this.showQuery=false;this.showCurrent();
			this.redirect({state:ProgState.root,command:"6"});
		}
	}
	
	async doGetInfo(command:string){
		if (command=="1") {
			console.log(rs.RROState);
			this.greet();
		}
		else if (command=="2") {
			await rs.getShiftsList(new Date(2020,3,1),new Date(2020,3,30));
			this.redirect({state:ProgState.shiftInfo,command:"-"});
		} 
		else if (command=="3") {
			console.log(rs.lastShiftTotal);
			this.greet();
		}
		else {this.greet();}
	}


	async doShift(command:string){
		let u:number=this.proceedTable(command,
			{table:rs.shifts,fields:["OpenShiftFiscalNum","Opened","Closed"],headers:["Fiscal num", "Opened","Closed"]},
			{state:ProgState.getInfo,command:"-"});
		if (u!=0)  {
			await rs.setShiftById(u-1);
			this.redirect({state:ProgState.listShiftDocuments,command:"-"});
		}
	}

	async doDocumentInfo(command:string){
		let u=this.proceedTable(command,
			{table:rs.documents,fields:["NumFiscal","NumLocal","DocClass","CheckDocType","Revoked"]},
			{state:ProgState.listShiftDocuments,command:"-"});
		if (u!=0) {
			await rs.setDocumentById(u-1);
			console.log(await rs.getDocInfo());
			this.greet();
		}
	}

}


//--------------------------------------
let prog=new ConsoleProg();

process.stdin.setEncoding('utf8');

process.stdin.on('readable', () => {
	let chunk;
	// Use a loop to make sure we read all available data.
	while ((chunk = process.stdin.read()) !== null) {
		let inText:string=chunk;
		inText=inText.replace(new RegExp("\\r?\\n", "g"), "");
		if (inText=="exit") process.exit(0);
		else prog.doCommand(inText);
	}
});

process.stdin.on('end', () => {process.stdout.write('end');});


let rs=new ERRO.ERROState();
rs.setConnectionSettings("80.91.165.208",80,"/er/cmd");
rs.setEncodingSettings("./keyfop/Key-6.dat","./keyfop/8030938.cer");
rs.setPass("tectfom","personal");
rs.onError=(error)=>{console.log(Colors.red+error+Colors.reset);}

prog.doStart();