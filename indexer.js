if (typeof nodeRequire=='undefined')nodeRequire=require;

var indexing=false; //only allow one indexing task
var projinfo=null;
var status={progress:0,done:false}; //progress ==1 completed
var session={};
var api=null;
var xml4kdb=null;
var isSkip=null;
var normalize=null;
var tokenize=null;
var fs=nodeRequire("fs");

var assert=require("assert");

console.log("xml4kdb",xml4kdb);
var parseBody=function(body,sep) {
	var res=xml4kdb.parseXML(body, {sep:sep});
	console.log(res.tags)
}
var putFile=function(fn) {
	var texts=fs.readFileSync(fn,session.config.inputEncoding);
	var bodyend=session.config.bodyend||"</body>";
	var bodystart=session.config.bodstart||"<body>";
	var cb=session.config.callbacks;
	var started=false,stopped=false;

	var start=texts.indexOf(bodystart);
	var end=texts.indexOf(bodyend);
	console.log("indexing ",fn,texts.length,start,end);
	assert.equal(end>start,true);

	// split source xml into 3 parts, before <body> , inside <body></body> , and after </body>

	if (cb.beforebodystart) cb.beforebodystart.apply(session,[texts.substring(0,start),status]);
	var body=texts.substring(start,end+bodyend.length);
	parseBody(body,session.config.pageSeparator);

	if (cb.afterbodyend) cb.afterbodyend.apply(session,[texts.substring(end+bodyend.length),status]);
}
var initSession=function(config) {
	var json={
		files:[]
		,fileContents:[]
		,fileNames:[]
		,fileOffsets:[]
		,postings:[[0]] //first one is always empty, because tokenid cannot be 0
		,tokens:{}
		,postingCount:0
	};
	config.inputEncoding=config.inputEncoding||"utf8";
	var session={vpos:1, json:json ,
		           indexedTextLength:0,config:config};
	return session;
}
var initIndexer=function(mkdbconfig) {
	session=initSession(mkdbconfig);
	session.filenow=0;
	session.files=mkdbconfig.files;
	status.done=false;
	api=nodeRequire("ksana-document").customfunc.getAPI(mkdbconfig.config);
	xml4kdb=nodeRequire("ksana-document").xml4kdb;
	normalize=api["normalize"];
	isSkip=api["isSkip"];
	tokenize=api["tokenize"];
	setTimeout(indexstep,1);
}

var start=function(mkdbconfig) {
	if (indexing) return null;
	indexing=true;
	if (!mkdbconfig.files.length) return null;//nothing to index

	initIndexer(mkdbconfig);
  	return status;
}


var indexstep=function() {
	
	if (session.filenow<session.files.length) {
		status.filename=session.files[session.filenow];
		status.progress=session.filenow/session.files.length;
		putFile(status.filename);
		session.filenow++;
		setTimeout(indexstep,1); //rest for 1 ms to response status
	} else {
		finalize(function() {
			status.done=true;
			indexing=false;
		});	
	}
}

var status=function() {
  return status;
}
var stop=function() {
  status.done=true;
  status.message="User Abort";
  indexing=false;
  return status;
}
var finalize=function(cb) {
	cb();
}
module.exports={start:start,stop:stop,status:status};