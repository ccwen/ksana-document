
function getFiles(dirs,filtercb){	
  var fs=nodeRequire('fs');
  var path=nodeRequire('path');
	var out=[];
  if (typeof dirs=='string')dirs=[dirs];

  for (var j=0;j<dirs.length;j++ ) {
    var dir=dirs[j];
    var files = fs.readdirSync(dir);
    for(var i in files){
      if (!files.hasOwnProperty(i)) continue;
      var name = dir+'/'+files[i],config=null;
      if (filtercb(name)) {
          var json=name+'/ksana.json';
          if (fs.existsSync(json)) {          
            config=JSON.parse(fs.readFileSync(name+'/ksana.json','utf8'));
            var stat=fs.statSync(json);
            config.lastModified=stat.mtime;
            config.folder=files[i];
            config.path=path.resolve(name);
          } else {
            config={name:name,shortname:files[i],path:path.resolve(name)}
          }
          out.push(config);
      }
    }
  }
  return out;
}
var getProjectFolders=function(p) {
  var fs=nodeRequire('fs');
  var folders= getFiles(p,function(name){
      return fs.statSync(name).isDirectory();
  });
  if (!folders.length)return folders;
  if (parseInt(folders[0].shortname)) {
    folders.sort(function(a,b) {
      return parseInt(a.shortname)-parseInt(b.shortname)
    })
  } else {
    folders.sort(function(a,b) {
      if (a.shortname==b.shortname) return 0; 
      else if (a.shortname>b.shortname) return 1; else return -1;
    });
  }
  return folders;
}
var getProjectFiles=function(p) {
  var fs=nodeRequire('fs');
  var files= getFiles(p.path,function(name){
      return name.indexOf(".kd")==name.length-3;
  });

  if (parseInt(files[0])) {
    files.sort(function(a,b) {
      return parseInt(a)-parseInt(b)
    })
  } else {
    files.sort(function(a,b) {
      if (a==b) return 0; else if (a>b) return 1; else return -1;
    });
  }
  return files;
}
var enumProject=function() { 
  var fs=nodeRequire('fs');
	//search for local 
	var folders= getFiles(['./ksana_databases','../ksana_databases'],function(name){
      if (fs.statSync(name).isDirectory()){
        return fs.existsSync(name+'/'+'ksana.json');
      }
  });
  return folders;
}

var openDocument=function(f) {
  var persistent=nodeRequire('ksana-document').persistent;
  //if empty file, create a empty
  var doc=persistent.open(f);
  return doc;
}
var installservice=function(services) {
	var API={ 
		enumProject:enumProject,
    getProjectFolders:getProjectFolders,
    getProjectFiles:getProjectFiles,
    openDocument:openDocument,
		version: function() { return require('./package.json').version }
	};
	if (services) {
		services['document']=API;
	}
	return API;
}

module.exports=installservice;