/* Ksana Database Engine
   middleware for client and server.
   each ydb has one engine instance.
   all data from server will be cache at client side to save network roundtrip.
*/
if (typeof nodeRequire=='undefined')var nodeRequire=require;
var pool={},localPool={};
var apppath="";
var bsearch=require("./bsearch");
var _getSync=function(keys,recursive) {
	var out=[];
	for (var i in keys) {
		out.push(this.getSync(keys[i],recursive));	
	}
	return out;
}
var _gets=function(keys,recursive,cb) { //get many data with one call
	if (!keys) return ;
	if (typeof keys=='string') {
		keys=[keys];
	}
	var engine=this, output=[];

	var makecb=function(key){
		return function(data){
				if (!(data && typeof data =='object' && data.__empty)) output.push(data);
				engine.get(key,recursive,taskqueue.shift());
		};
	};

	var taskqueue=[];
	for (var i=0;i<keys.length;i++) {
		if (typeof keys[i]=="null") { //this is only a place holder for key data already in client cache
			output.push(null);
		} else {
			taskqueue.push(makecb(keys[i]));
		}
	};

	taskqueue.push(function(data){
		output.push(data);
		cb.apply(engine.context||engine,[output,keys]); //return to caller
	});

	taskqueue.shift()({__empty:true}); //run the task
}

var toDoc=function(pagenames,texts,parents,reverts) {
	if (typeof Require!="undefined") {
		var D=Require("ksana-document").document;
	} else {
		var D=nodeRequire("./document");	
	}
	var d=D.createDocument() ,revert=null;
	for (var i=0;i<texts.length;i++) {
		if (reverts && reverts[i].trim()) revert=JSON.parse(reverts[i]);
		else revert=null;
		var p=null;
		if (parents) p=parents[i];
		d.createPage({n:pagenames[i],t:texts[i],p:p,r:revert});
	}
	d.endCreatePages();
	return d;
}
var getFileRange=function(i) {
	var engine=this;
	var fileOffsets=engine.get(["fileOffsets"]);
	var pageOffsets=engine.get(["pageOffsets"]);
	var pageNames=engine.get(["pageNames"]);
	var fileStart=fileOffsets[i],fileEnd=fileOffsets[i+1];

	var start=bsearch(pageOffsets,fileStart);
	var end=bsearch(pageOffsets,fileEnd);
	//in case of items with same value
	//return the last one
	while (pageOffsets[start+1]==pageOffsets[start]) start++; 
	while (pageOffsets[end+1]==pageOffsets[end]) end++;

	return {start:start,end:end};
}
var getFilePageOffsets=function(i) {
	var pageOffsets=this.get("pageOffsets");
	var range=getFileRange.apply(this,[i]);
	return pageOffsets.slice(range.start,range.end+1);
}

var getFilePageNames=function(i) {
	var range=getFileRange.apply(this,[i]);
	var pageNames=this.get("pageNames");
	return pageNames.slice(range.start,range.end);
}
var getDocument=function(filename,cb){
	var engine=this;
	var filenames=engine.get("fileNames");
	
	var i=filenames.indexOf(filename);
	if (i==-1) {
		cb(null);
	} else {
		var pagenames=getFilePageNames.apply(engine,[i]);
		var files=engine.get(["files",i],true,function(file){
			var parentId=null,reverts=null;
			if (file) {
				parentId=file.parentId;
				reverts=file.reverts;
			}
			engine.get(["fileContents",i],true,function(data){
				cb(toDoc(pagenames,data,parentId,reverts));
			});			
		});
	}
}
var createLocalEngine=function(kdb,cb,context) {
	var engine={lastAccess:new Date(), kdb:kdb, queryCache:{}, postingCache:{}, cache:{}};

	if (kdb.fs.html5fs) {
		var customfunc=Require("ksana-document").customfunc;
	} else {
		var customfunc=nodeRequire("ksana-document").customfunc;	
	}	
	if (typeof context=="object") engine.context=context;
	engine.get=function(key,recursive,cb) {

		if (typeof recursive=="function") {
			cb=recursive;
			recursive=false;
		}
		if (!key) {
			if (cb) cb(null);
			return null;
		}

		if (typeof cb!="function") {
			if (kdb.fs.html5fs) {
				return engine.kdb.get(key,recursive,cb);
			} else {
				return engine.kdb.getSync(key,recursive);
			}
		}

		if (typeof key=="string") {
			return engine.kdb.get([key],recursive,cb);
		} else if (typeof key[0] =="string") {
			return engine.kdb.get(key,recursive,cb);
		} else if (typeof key[0] =="object") {
			return _gets.apply(engine,[key,recursive,cb]);
		} else {
			cb(null);	
		}
	};	
	engine.fileOffset=fileOffset;
	engine.folderOffset=folderOffset;
	engine.pageOffset=pageOffset;
	engine.getDocument=getDocument;
	engine.getFilePageNames=getFilePageNames;
	engine.getFilePageOffsets=getFilePageOffsets;
	//only local engine allow getSync
	if (!kdb.fs.html5fs)	engine.getSync=engine.kdb.getSync;
	var preload=[["meta"],["fileNames"],["fileOffsets"],
	["tokens"],["postingslen"],["pageNames"],["pageOffsets"]];

	var setPreload=function(res) {
		engine.dbname=res[0].name;
		engine.customfunc=customfunc.getAPI(res[0].config);
		engine.ready=true;
	}
	if (typeof cb=="function") {
		_gets.apply(engine,[  preload, true,function(res){
			setPreload(res);
			cb.apply(engine.context,[engine]);
		}]);
	} else {
		setPreload(_getSync.apply(engine,[preload,true]));
	}
	return engine;
}

var getRemote=function(key,recursive,cb) {
	var $kse=Require("ksanaforge-kse").$ksana; 
	var engine=this;
	if (!engine.ready) {
		console.error("remote connection not established yet");
		return;
	} 
	if (typeof recursive=="function") {
		cb=recursive;
		recursive=false;
	}
	recursive=recursive||false;
	if (typeof key=="string") key=[key];

	if (key[0] instanceof Array) { //multiple keys
		var keys=[],output=[];
		for (var i=0;i<key.length;i++) {
			var cachekey=key[i].join("\0");
			var data=engine.cache[cachekey];
			if (typeof data!="undefined") {
				keys.push(null);//  place holder for LINE 28
				output.push(data); //put cached data into output
			} else{
				engine.fetched++;
				keys.push(key[i]); //need to ask server
				output.push(null); //data is unknown yet
			}
		}
		//now ask server for unknown datum
		engine.traffic++;
		var opts={key:keys,recursive:recursive,db:engine.kdbid};
		$kse("get",opts).done(function(datum){
			//merge the server result with cached 
			for (var i=0;i<output.length;i++) {
				if (datum[i] && keys[i]) {
					var cachekey=keys[i].join("\0");
					engine.cache[cachekey]=datum[i];
					output[i]=datum[i];
				}
			}
			cb.apply(engine.context,[output]);	
		});
	} else { //single key
		var cachekey=key.join("\0");
		var data=engine.cache[cachekey];
		if (typeof data!="undefined") {
			if (cb) cb.apply(engine.context,[data]);
			return data;//in cache , return immediately
		} else {
			engine.traffic++;
			engine.fetched++;
			var opts={key:key,recursive:recursive,db:engine.kdbid};
			$kse("get",opts).done(function(data){
				engine.cache[cachekey]=data;
				if (cb) cb.apply(engine.context,[data]);	
			});
		}
	}
}
var pageOffset=function(pagename) {
	var engine=this;
	if (arguments.length>1) throw "argument : pagename ";

	var pageNames=engine.get("pageNames");
	var pageOffsets=engine.get("pageOffsets");

	var i=pageNames.indexOf(pagename);
	return (i>-1)?pageOffsets[i]:0;
}
var fileOffset=function(fn) {
	var engine=this;
	var filenames=engine.get("fileNames");
	var offsets=engine.get("fileOffsets");
	var i=filenames.indexOf(fn);
	if (i==-1) return null;
	return {start: offsets[i], end:offsets[i+1]};
}

var folderOffset=function(folder) {
	var engine=this;
	var start=0,end=0;
	var filenames=engine.get("fileNames");
	var offsets=engine.get("fileOffsets");
	for (var i=0;i<filenames.length;i++) {
		if (filenames[i].substring(0,folder.length)==folder) {
			if (!start) start=offsets[i];
			end=offsets[i];
		} else if (start) break;
	}
	return {start:start,end:end};
}

var createEngine=function(kdbid,context,cb) {
	if (typeof context=="function"){
		cb=context;
	}
	//var link=Require("./link");
	var customfunc=Require("ksana-document").customfunc;
	var $kse=Require("ksanaforge-kse").$ksana; 
	var engine={lastAccess:new Date(), kdbid:kdbid, cache:{} , 
	postingCache:{}, queryCache:{}, traffic:0,fetched:0};
	engine.setContext=function(ctx) {this.context=ctx};
	engine.get=getRemote;
	engine.fileOffset=fileOffset;
	engine.folderOffset=folderOffset;
	engine.pageOffset=pageOffset;
	engine.getDocument=getDocument;
	engine.getFilePageNames=getFilePageNames;
	engine.getFilePageOffsets=getFilePageOffsets;

	if (typeof context=="object") engine.context=context;

	//engine.findLinkBy=link.findLinkBy;
	$kse("get",{key:[["meta"],["fileNames"],["fileOffsets"],["tokens"],["postingslen"],,["pageNames"],["pageOffsets"]], 
		recursive:true,db:kdbid}).done(function(res){
		engine.dbname=res[0].name;

		engine.cache["fileNames"]=res[1];
		engine.cache["fileOffsets"]=res[2];
		engine.cache["tokens"]=res[3];
		engine.cache["postingslen"]=res[4];
		engine.cache["pageNames"]=res[5];
		engine.cache["pageOffsets"]=res[6];

//		engine.cache["tokenId"]=res[4];
//		engine.cache["files"]=res[2];

		engine.customfunc=customfunc.getAPI(res[0].config);
		engine.cache["meta"]=res[0]; //put into cache manually

		engine.ready=true;
		//console.log("remote kde connection ["+kdbid+"] established.");
		if (cb) cb.apply(context,[engine]);
	})


	return engine;
}
 //TODO delete directly from kdb instance
 //kdb.free();
var closeLocal=function(kdbid) {
	var engine=localPool[kdbid];
	if (engine) {
		engine.kdb.free();
		delete localPool[kdbid];
	}
}
var close=function(kdbid) {
	var engine=pool[kdbid];
	if (engine) {
		engine.kdb.free();
		delete pool[kdbid];
	}
}
var open=function(kdbid,cb,context) {
	if (typeof io=="undefined") { //for offline mode
		return openLocal(kdbid,cb,context);
	}

	var engine=pool[kdbid];
	if (engine) {
		if (cb) cb.apply(context||engine.context,[engine]);
		return engine;
	}
	engine=createEngine(kdbid,context,cb);

	pool[kdbid]=engine;
	return engine;
}
var openLocalNode=function(kdbid,cb,context) {
	var fs=nodeRequire('fs');
	var Kdb=nodeRequire('ksana-document').kdb;
	var engine=localPool[kdbid];
	if (engine) {
		if (cb) cb(engine);
		return engine;
	}

	var kdbfn=kdbid;
	if (kdbfn.indexOf(".kdb")==-1) kdbfn+=".kdb";

	var tries=["./"+kdbfn  //TODO , allow any depth
	           ,apppath+"/"+kdbfn,
	           ,apppath+"/ksana_databases/"+kdbfn
	           ,apppath+"/"+kdbfn,
	           ,"./ksana_databases/"+kdbfn
	           ,"../"+kdbfn
	           ,"../ksana_databases/"+kdbfn
	           ,"../../"+kdbfn
	           ,"../../ksana_databases/"+kdbfn
	           ,"../../../"+kdbfn
	           ,"../../../ksana_databases/"+kdbfn
	           ];

	for (var i=0;i<tries.length;i++) {
		if (fs.existsSync(tries[i])) {
			//console.log("kdb path: "+nodeRequire('path').resolve(tries[i]));
			new Kdb(tries[i],function(kdb){
				createLocalEngine(kdb,function(engine){
						localPool[kdbid]=engine;
						cb.apply(context||engine.context,[engine]);
				},context);
			});
			return engine;
		}
	}
	if (cb) cb(null);
	return null;
}

var openLocalHtml5=function(kdbid,cb,context) {
	var Kdb=Require('ksana-document').kdb;
	
	var engine=localPool[kdbid];
	if (engine) {
		if (cb) cb.apply(context||engine.context,[engine]);
		return engine;
	}
	var Kdb=Require('ksana-document').kdb;
	var kdbfn=kdbid;
	if (kdbfn.indexOf(".kdb")==-1) kdbfn+=".kdb";
	new Kdb(kdbfn,function(handle){
		createLocalEngine(handle,function(engine){
			localPool[kdbid]=engine;
			cb.apply(context||engine.context,[engine]);
		},context);		
	});
}
//omit cb for syncronize open
var openLocal=function(kdbid,cb,context)  {
	if (kdbid.indexOf("filesystem:")>-1 || typeof process=="undefined") {
		openLocalHtml5(kdbid,cb,context);
	} else {
		openLocalNode(kdbid,cb,context);
	}
}
var setPath=function(path) {
	apppath=path;
	console.log("set path",path)
}

var enumKdb=function(cb,context){
	Require("ksana-document").html5fs.readdir(function(out){
		cb.apply(this,[out]);
	},context||this);
}

module.exports={openLocal:openLocal, open:open, close:close, 
	setPath:setPath, closeLocal:closeLocal, enumKdb:enumKdb};