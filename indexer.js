if (typeof nodeRequire=='undefined')nodeRequire=require;
var fs=nodeRequire("fs");
var projects=nodeRequire("ksana-document").projects;
var customfunc=nodeRequire("customfunc");
var ydbw=nodeRequire("ydbw");
/*
  text:       [ [page_text][page_text] ]
  pagenames:  []
  tokentree:  []
  
  search engine API: 
  getToken        //return raw posting
  getText(vpos)   //return raw page text
    getPageText   
  vpos2pgoff      //virtual posting to page offset
  groupBy         //convert raw posting to group (with optional converted offset) 
  findMarkupInRange
*/


var indexing=false; //only allow one indexing task
var projinfo=null;
var status={progress:1,done:false};
var session={};
var api=null;
var isSkip=null;
var isSeachable=null;
var tokenize=null;

var putPosting=function(tk) {
	var	posting=session.postings[tk];
	if (!posting) {
		session.postingCount++;
		posting=session.postings[tk]=[];
	}
	posting.push(session.vpos);
}
var putExtra=function(arr_of_key_vpos_payload) {
	//which markup to be added in the index
	//is depended on application requirement...
	//convert markup start position to vpos
	// application  key-values  pairs
	//    ydb provide search for key , return array of vpos
	//        and given range of vpos, return all key in the range
  // structure
  // key , 
}
var putPage=function(docPage) {
	var tokenized=tokenize(docPage.inscription);

	session.json.pagename.push(docPage.name);
	session.json.pageoffset.push(session.vpos);

	for (var i=0;i<tokenized.length;i++) {
		var t=tokenized.tokens[i];
		var normalized=normalize(t);
		if (normalized) {
			putPosting(normalized);
 		} else {
 			if (isSkip(t)) session.vpos--;
 		}
 		session.vpos++;
	}

	session.indexedTextLength+= docPage.inscription.length;
}

var indexfile=function(fn) {
	var persistent=nodeRequire("ksana-document").persistent;
	var doc=persistent.createLocal(fn);

	for (var i=0;i<doc.pageCount;i++) {
		var pg=doc.getPage(i);
		putPage(pg);
	}
}
var initSession=function() {
	var json={
		pagename:[],
		pageoffset:[],
		postings:{},
		postingCount:0,
	};
	var session={vpos:1, json:json , 
		           indexedTextLength:0,
		           options: projinfo.ksana.indexopt };
	return session;
}
var initIndexer=function() {
	var session=initSession();
	session.filenow=0;
	session.files=projinfo.files;

	api=customfunc.getAPI(projinfo.ksana.template);
	
	isSearchable=api("isSearchable");
	isSkip=api("isSkip");
	tokenize=api("tokenize");
	setTimeout(indexstep,1);
}

var getMeta=function() {
	var meta={};
	meta.apiversion=api.getVersion();
	meta.name=projinfo.project.shortname;
	return meta;
}

var backupFilename=function(ydbfn) {
	//user has a chance to recover from previous ydb
	return ydbfn+"k"; //todo add date in the middle
}

var finalize=function(cb) {
	var opt=session.options;
	var ydbfn=projinfo.project.filename+'.ydb';
	output.meta=getMeta();
	fs.renameSync(ydbfn,backupFilename(ydbfn));
	status.message='writing '+ydbfn;
	output=api("optimize")(session.json,session.indexopt.template);
	ydb.writeFile(fn,function(total,written) {
		status.progress=written/total;
		if (total==written) cb();
	});
}

var indexstep=function() {
	if (session.filenow<session.files.length) {
		status.filename=session.files[session.filenow];
		status.progress=Math.floor((session.filenow/session.files.length)*100);
		indexfile(status.filename);
		session.filenow++;
		setTimeout(indexstep,1); //rest for 1 ms to response status
	} else {
		finalize(function() {
			status.done=true;
			indexing=false;
		}
	}
}

var status=function() {
  return status;
}
var start=function(projname) {
	if (indexing) return null;
	indexing=true;

	projinfo=projects.fullInfo(projname);
	if (!projinfo.files.length) return null;//nothing to index

	initIndexer();
  status.projectname=projname;
  return status;
}

var stop=function(status) {
  status.done=true;
  indexing=false;
  return status;
}
module.exports={start:start,stop:stop,status:status};