if (typeof nodeRequire=='undefined')nodeRequire=require;

var getProjectPath=function(p) {
  var path=nodeRequire('path');
  return path.resolve(p.filename);
};


var enumProject=function() { 
  return nodeRequire("ksana-document").projects.names();
};
var enumKdb=function(paths) {
  if (typeof paths=="string") {
    paths=[paths];
  }
  var db=nodeRequire("./projects").getFiles(paths,function(p){
    return p.substring(p.length-4)==".kdb";
  });
  return db.map(function(d){
    return d.shortname.substring(0,d.shortname.length-4)
  });
}
var loadDocumentJSON=function(opts) {
  var persistent=nodeRequire('ksana-document').persistent;
  var ppath=getProjectPath(opts.project);
  var path=nodeRequire('path');
  //if empty file, create a empty
  var docjson=persistent.loadLocal(  path.resolve(ppath,opts.file));
  return docjson;
};
var findProjectPath=function(dbid) {
  var fs=nodeRequire("fs");
  var path=nodeRequire('path');
  var tries=[ //TODO , allow any depth
               "./ksana_databases/"+dbid
               ,"../ksana_databases/"+dbid
               ,"../../ksana_databases/"+dbid
               ,"../../../ksana_databases/"+dbid
               ];
    for (var i=0;i<tries.length;i++){
      if (fs.existsSync(tries[i])) {
        return path.resolve(tries[i]);
      }
    }
    return null;
}
var saveMarkup=function(opts) {
  var path=nodeRequire('path');
  var persistent=nodeRequire('ksana-document').persistent;
  var filename=opts.filename;
  if (opts.dbid) {
    var projectpath=findProjectPath(opts.dbid);
    if (projectpath) filename=path.resolve(projectpath,filename);
  } 
  return persistent.saveMarkup(opts.markups, filename,opts.pageid||opts.i);
};
var saveDocument=function(opts) {
  var persistent=nodeRequire('ksana-document').persistent;
  return persistent.saveDocument(opts.doc , opts.filename);
};
var getUserSettings=function(user) {
  var fs=nodeRequire('fs');
  var defsettingfilename='./settings.json';
  if (typeof user=="undefined") {
    if (fs.existsSync(defsettingfilename)) {
      return JSON.parse(fs.readFileSync(defsettingfilename,'utf8'));  
    }
  }
  return {};
}
var buildIndex=function(projname) {
  nodeRequire('ksana-document').indexer.start(projname);
}
var buildStatus=function(session) {
  return nodeRequire("ksana-document").indexer.status(session);
}
var stopIndex=function(session) {
  return nodeRequire("ksana-document").indexer.stop(session);
} 
var getProjectFolders=function(p) {
  return nodeRequire("ksana-document").projects.folders(p.filename);
}
var getProjectFiles=function(p) {
  return nodeRequire("ksana-document").projects.files(p.filename);
}

var search=function(opts) {
  return require("./kse").search(opts);
}
var get=function(opts,cb) {
  require("./kde").openLocal(opts.db,function(engine){
      if (!engine) {
        throw "database not found "+opts.db;
      }
      engine.get(opts.key,opts.recursive,function(data){cb(0,data)});
  });
}
var setPath=function(path) {
  nodeRequire("ksana-document").setPath(path);
}
get.async=true;

var markup=require('./markup.js');
var users=require('./users');
var installservice=function(services) {
	var API={ 
        enumProject:enumProject
        ,enumKdb:enumKdb
        ,getProjectFolders:getProjectFolders
        ,getProjectFiles:getProjectFiles
        ,loadDocumentJSON:loadDocumentJSON
        ,saveMarkup:saveMarkup
        ,saveDocument:saveDocument
        ,login:users.login
        ,getUserSettings:getUserSettings
        ,buildIndex:buildIndex
        ,buildStatus:buildStatus
        ,stopIndex:stopIndex
        ,search:search
        ,get:get
        ,setPath:setPath
	  ,version: function() { return require('./package.json').version; }
	};
	if (services) {
		services.document=API;
	}
	return API;
};

module.exports=installservice;