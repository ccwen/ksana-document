if (typeof nodeRequire=='undefined')nodeRequire=require;

var getProjectPath=function(p) {
  var path=nodeRequire('path');
  return path.resolve(p.filename);
};
var enumProject=function() { 
  return nodeRequire("ksana-document").projects.names();
};

var openDocument=function(f) {
  var persistent=nodeRequire('ksana-document').persistent;
  //if empty file, create a empty
  var doc=persistent.open(f);
  return doc;
};

var saveMarkup=function(opts) {
  var persistent=nodeRequire('ksana-document').persistent;
  return persistent.saveMarkup(opts.markups , opts.filename,opts.pageid||opts.i);
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
  var indexer=nodeRequire('ksana-document').indexer.start();
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
var kse=require("./kse");
var search=function(opts) {
  return kse.search(opts);
}
var markup=require('./markup.js');
var users=require('./users');
var installservice=function(services) {
	var API={ 
		enumProject:enumProject,
    getProjectFolders:getProjectFolders,
    getProjectFiles:getProjectFiles,
    openDocument:openDocument,
    saveMarkup:saveMarkup,
    saveDocument:saveDocument,
    login:users.login,
    getUserSettings:getUserSettings,
    buildIndex:buildIndex,
    buildStatus:buildStatus,
    stopIndex:stopIndex,
    search:search,
		version: function() { return require('./package.json').version; }
	};
	if (services) {
		services.document=API;
	}
	return API;
};

module.exports=installservice;