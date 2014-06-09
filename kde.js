/* Ksana Database Engine
   middleware for client and server.
   each ydb has one engine instance.
   all data from server will be cache at client side to save network roundtrip.
*/
if (typeof nodeRequire=='undefined')nodeRequire=require;

var pool={},localPool={};
var customfunc=require("./customfunc");
var link=require("./link");
var apppath="";
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
		cb(output,keys); //return to caller
	});

	taskqueue.shift()({__empty:true}); //run the task
}
var createLocalEngine=function(kdb,cb) {
	var engine={lastAccess:new Date(), kdb:kdb};

	kdb.get(["meta"],true,function(res){
		engine.dbname=res.name;
		engine.customfunc=customfunc.getAPI(res.cofig);
		//if (cb) cb(engine);
	});

	kdb.get([["fileNames"],["fileOffsets"],["files"]], true,function(res){
		engine.ready=true;
		if (cb) cb(engine);
	});

	engine.queryCache={};
	engine.postingCache={}; //cache for merged posting

	engine.get=function(key,recursive,cb) {
		if (typeof recursive=="function") {
			cb=recursive;
			recursive=false;
		}
		if (!key) {
			if (cb) cb(null);
			return null;
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
	return engine;
}

var getRemote=function(key,recursive,cb) {
	var $kse=Require("ksanaforge-kse").$yase; 
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
var pageOffset=function(fn,pagename) {
	var engine=this;
	var filenames=engine.get("fileNames");
	var files=engine.get("files");
	var i=filenames.indexOf(fn);
	if (i==-1) return null;

	var j=files[i].pageNames.indexOf(pagename);
	if (j==-1) return null;

	return {start: files[i].pageOffset[j] , end:files[i].pageOffset[j+1]};
}
var fileOffset=function(fn) {
	var engine=this;

	var files=engine.get("fileNames");
	var offsets=engine.get("fileOffsets");
	var i=files.indexOf(fn);
	if (i==-1) return null;

	return {start: offsets[i], end:offsets[i+1]};
}

var folderOffset=function(folder) {
	var engine=this;
	var start=0,end=0;
	var files=engine.get("fileNames");
	var offsets=engine.get("fileOffsets");
	for (var i=0;i<files.length;i++) {
		if (files[i].substring(0,folder.length)==folder) {
			if (!start) start=offsets[i];
			end=offsets[i];
		} else if (start) break;
	}
	return {start:start,end:end};
}


var createEngine=function(kdbid,cb) {
	var $kse=Require("ksanaforge-kse").$yase; 
	var engine={lastAccess:new Date(), kdbid:kdbid, cache:{} , 
	postingCache:{}, queryCache:{}, traffic:0,fetched:0};
	engine.setContext=function(ctx) {this.context=ctx};
	engine.get=getRemote;
	engine.fileOffset=fileOffset;
	engine.folderOffset=folderOffset;
	engine.pageOffset=pageOffset;

	engine.findLinkBy=link.findLinkBy;
	$kse("get",{key:[["fileNames"],["fileOffsets"],["files"],["meta"]], recursive:true,db:kdbid}).done(function(res){
		engine.cache["fileNames"]=res[0];
		engine.cache["fileOffsets"]=res[1];
		engine.cache["files"]=res[2];

		engine.dbname=res[3].name;
		engine.customfunc=customfunc.getAPI(res[3].config);
		engine.cache["meta"]=res[3]; //put into cache manually

		engine.ready=true;
		//console.log("remote kde connection ["+kdbid+"] established.");
		if (cb) cb(engine);
	})


	return engine;
}
 
var close=function(kdbid) {
	var engine=localPool[kdbid];
	if (engine) delete localPool[kdbid];
}
var open=function(kdbid,cb) {
	if (!kdbid) {
		cb(null);
		return null;
	};
	var engine=localPool[kdbid];
	if (engine) {
		if (cb) cb(engine);
		return engine;
	}
	engine=createEngine(kdbid,cb);
	localPool[kdbid]=engine;
	return engine;
}

var openLocal=function(kdbid,cb)  {
	var fs=nodeRequire('fs');
	var Kdb=nodeRequire('ksana-document').kdb;
	var engine=pool[kdbid];
	if (engine) {
		if (cb) cb(engine);
		return engine;
	}

	var kdbfn=kdbid+'.kdb';

	var tries=["./"+kdbfn  //TODO , allow any depth
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
		console.log(tries[i]);
		if (fs.existsSync(tries[i])) {
			kdb=new Kdb(tries[i]);
			if (kdb) {
				createLocalEngine(kdb,function(engine){
					pool[kdbid]=engine;
					cb(engine);
				});
				return engine;
			}
		}
	}
	cb(null);
	return null;
}
var setPath=function(path) {
	apppath=path;
	console.log("set path",path)
}

module.exports={openLocal:openLocal, open:open, close:close, setPath:setPath};