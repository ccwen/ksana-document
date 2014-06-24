if (typeof nodeRequire=='undefined')nodeRequire=require;
var indexing=false; //only allow one indexing task
var status={pageCount:0,progress:0,done:false}; //progress ==1 completed
var session={};
var api=null;
var xml4kdb=null;
var isSkip=null;
var normalize=null;
var tokenize=null;

var putPosting=function(tk) {
	var	postingid=session.json.tokens[tk];
	var out=session.json;
	if (!postingid) {
		out.postingCount++;
		posting=out.postings[out.postingCount]=[];
		session.json.tokens[tk]=out.postingCount;
	} else {
		posting=out.postings[postingid];
	}
	posting.push(session.vpos);
}
var putPage=function(inscription) {
	var tokenized=tokenize(inscription);
	for (var i=0;i<tokenized.tokens.length;i++) {
		var t=tokenized.tokens[i];
		if (isSkip(t)) {
			 session.vpos--;
		} else {
			var normalized=normalize(t);
			if (normalized) 	putPosting(normalized);
 		}
 		session.vpos++;
	}
	session.indexedTextLength+= inscription.length;
}
var upgradeDocument=function(d,dnew) {
	var Diff=nodeRequire("./diff");	
	dnew.map(function(pg){
		var oldpage=d.pageByName(pg.name);
		var ninscription=dnew.inscription;
		if (oldpage) {
			var diff=new Diff();
			var oinscription=oldpage.inscription;
			var df=diff.diff_main(oinscription, pg.inscription);

			var revisioncount=oldpage.addRevisionsFromDiff(df);
			if (revisioncount) d.evolvePage(oldpage);
		} else {
			d.createPage({n:pgname,t:ninscription});
		}
	});	
}
var shortFilename=function(fn) {
	var arr=fn.split('/');
	while (arr.length>2) arr.shift();
	return arr.join('/');
}
var putDocument=function(parsed,cb) {
	var D=nodeRequire("./document");

	var indexpages=function(doc) {
		var fileInfo={pageNames:[],pageOffset:[],parentId:[],reverts:[]};
		var fileContent=[];
		var shortfn=shortFilename(status.filename);
		session.json.files.push(fileInfo);
		session.json.fileContents.push(fileContent);
		session.json.fileNames.push(shortfn);
		session.json.fileOffsets.push(session.vpos);
		var hasParentId=false, hasRevert=false;
		for (var i=1;i<doc.pageCount;i++) {
			var pg=doc.getPage(i);
			if (pg.isLeafPage()) {
				fileContent.push(pg.inscription);
				putPage(pg.inscription);
			} else {
				fileContent.push("");
			}
			fileInfo.pageNames.push(pg.name);
			fileInfo.pageOffset.push(session.vpos);
			fileInfo.parentId.push(pg.parentId);
			if (pg.parentId) hasParentId=true;
			var revertstr="";
			if (pg.parentId) revertstr=JSON.stringify(pg.compressedRevert());
			if (revertstr) hasRevert=true;
			fileInfo.reverts.push( revertstr );
		}
		if (!hasParentId) delete fileInfo["parentId"];
		if (!hasRevert) delete fileInfo["reverts"];
		fileInfo.pageOffset.push(session.vpos); //ending terminator
		cb();//finish
	}
	var dnew=D.createDocument(parsed.texts);

	if (session.kdb) {
		session.kdb.getDocument(status.filename,function(d){
			if (d) {
				upgradeDocument(d,dnew);
				indexpages(d);
				status.pageCount+=d.pageCount;
			} else { //no such page in old kdb
				indexpages(dnew);
				status.pageCount+=dnew.pageCount;
			}
		});
	} else {
		indexpages(dnew);
		status.pageCount+=dnew.pageCount;
	}
}

var parseBody=function(body,sep,cb) {
	var res=xml4kdb.parseXML(body, {sep:sep});
	putDocument(res,cb);
}


var putFile=function(fn,cb) {
	var fs=nodeRequire("fs");
	var texts=fs.readFileSync(fn,session.config.inputEncoding).replace(/\r\n/g,"\n");
	var bodyend=session.config.bodyend;
	var bodystart=session.config.bodystart;
	var callbacks=session.config.callbacks||{};
	var started=false,stopped=false;

	if (callbacks.onFile) callbacks.onFile.apply(session,[fn,status]);
	var start=bodystart ? texts.indexOf(bodystart) : 0 ;
	var end=bodyend? texts.indexOf(bodyend): texts.length;
	if (!bodyend) bodyendlen=0;
	else bodyendlen=bodyend.length;
	//assert.equal(end>start,true);

	// split source xml into 3 parts, before <body> , inside <body></body> , and after </body>

	if (callbacks.beforebodystart) callbacks.beforebodystart.apply(session,[texts.substring(0,start),status]);
	var body=texts.substring(start,end+bodyendlen);
	parseBody(body,session.config.pageSeparator,function(){
		if (callbacks.afterbodyend) callbacks.afterbodyend.apply(session,[texts.substring(end+bodyend.length),status]);
		cb(); //parse body finished
	});	
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
	var session={vpos:1, json:json , kdb:null, filenow:0,done:false
		           ,indexedTextLength:0,config:config,files:config.files};
	return session;
}
var initIndexer=function(mkdbconfig) {
	var Kde=nodeRequire("./kde");

	session=initSession(mkdbconfig);
	api=nodeRequire("ksana-document").customfunc.getAPI(mkdbconfig.config);
	xml4kdb=nodeRequire("ksana-document").xml4kdb;

	normalize=api["normalize"];
	isSkip=api["isSkip"];
	tokenize=api["tokenize"];

	session.kdbfn=session.config.name+'.kdb';
	if (!session.config.reset && nodeRequire("fs").existsSync(session.kdbfn)) {
		//if old kdb exists and not reset 
		Kde.openLocal(session.kdbfn,function(db){
			session.kdb=db;
			setTimeout(indexstep,1);
		});
	} else {
		setTimeout(indexstep,1);
	}
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
		putFile(status.filename,function(){
			session.filenow++;
			setTimeout(indexstep,1); //rest for 1 ms to response status			
		});
	} else {
		finalize(function() {
			status.done=true;
			indexing=false;
			if (session.config.finalized) {
				session.config.finalized(session,status);
			}
		});	
	}
}

var getstatus=function() {
  return status;
}
var stop=function() {
  status.done=true;
  status.message="User Abort";
  indexing=false;
  return status;
}
var backupFilename=function(ydbfn) {
	//user has a chance to recover from previous ydb
	return ydbfn+"k"; //todo add date in the middle
}

var backup=function(ydbfn) {
	var fs=nodeRequire("fs");
	var fs=nodeRequire('fs');
	if (fs.existsSync(ydbfn)) {
		var bkfn=ydbfn+'k';
		if (fs.existsSync(bkfn)) fs.unlinkSync(bkfn);
		fs.renameSync(ydbfn,bkfn);
	}
}
var createMeta=function() {
	var meta={};
	meta.config=session.config.config;
	meta.name=session.config.name;
	meta.vsize=session.vpos;
	return meta;
}
var guessSize=function() {
	return session.vpos * 5;
}
var finalize=function(cb) {	
	var Kde=nodeRequire("./kde");

	if (session.kdb) Kde.closeLocal(session.kdbfn);

	session.json.fileOffsets.push(session.vpos); //serve as terminator
	session.json.meta=createMeta();
	
	if (!session.config.nobackup) backup(session.kdbfn);
	status.message='writing '+session.kdbfn;
	//output=api("optimize")(session.json,session.ydbmeta.config);
	var opts={size:session.config.estimatesize};
	if (!opts.size) {
		opts.size=guessSize();
		console.log("guest size",opts.size);
	}

	var kdbw =nodeRequire("ksana-document").kdbw(session.kdbfn,opts);
	//console.log(JSON.stringify(session.json,""," "));
	kdbw.save(session.json,null,{autodelete:true});
	
	kdbw.writeFile(session.kdbfn,function(total,written) {
		status.progress=written/total;
		status.outputfn=session.kdbfn;
		if (total==written) cb();
	});
}
module.exports={start:start,stop:stop,status:getstatus};