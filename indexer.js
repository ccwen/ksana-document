if (typeof nodeRequire=='undefined')nodeRequire=require;

var indexing=false; //only allow one indexing task
var files=[];
var filenow=0;
var project=null;
var session={progress:1,done:false};

var indexfile=function(fn) {
	var persistent=nodeRequire("ksana-document").persistent;
	var content=persistent.loadLocal(fn);
	//reorder
}
var initIndexer=function() {
	setTimeout(indexstep,1);
}

var indexstep=function() {
	if (filenow<files.length) {
		session.filename=files[filenow];
		session.progress=Math.floor((filenow/files.length)*100);
		indexfile(session.filename);
		filenow++;
		setTimeout(indexstep,1);
	} else {
		session.done=true;
		indexing=false;
	}
}

var status=function() {
  return session;
}
var start=function(projname) {
	if (indexing) return null;
	indexing=true;

	var res=nodeRequire("ksana-document").projects.allFiles(projname);
	project=res.project;
	files=res.files;
	filenow=0;
	if (!files.length) return null;//nothing to index

	initIndexer(project,files);
  session.projectname=projname;
  return session;
}

var stop=function(session) {
  session.done=true;
  indexing=false;
  return session;
}
module.exports={start:start,stop:stop,status:status};