if (typeof nodeRequire=='undefined')nodeRequire=require;
function getFiles(dirs,filtercb){	
  var fs=nodeRequire('fs');
  var path=nodeRequire('path');
	var out=[];
  var shortnames={}; //shortname must be unique
  if (typeof dirs=='string')dirs=[dirs];

  for (var j=0;j<dirs.length;j++ ) {
    var dir=dirs[j];
    if (!fs.existsSync(dir))continue;
    var files = fs.readdirSync(dir);
    for(var i in files){
      if (!files.hasOwnProperty(i)) continue;
      if (files[i][0]==".") continue;//skip hidden file
      var name = dir+'/'+files[i],config=null;
      if (filtercb(name)) {
          var json=name+'/ksana.json';
          if (fs.existsSync(json)) {          
            config=JSON.parse(fs.readFileSync(name+'/ksana.json','utf8'));
            var stat=fs.statSync(json);
            config.lastModified=stat.mtime;
            config.shortname=files[i];
            config.filename=name;
          } else {
            config={name:name,filename:name,shortname:files[i]};
          }
          var pathat=config.filename.lastIndexOf('/');
          config.withfoldername=config.filename.substring(1+config.filename.lastIndexOf('/',pathat-1));

          if (!shortnames[files[i]]) out.push(config);
          shortnames[files[i]]=true;
      }
    }
  }
  return out;
}

var _folders=function(path) {
  var fs=nodeRequire('fs');
  var folders= getFiles( path ,function(name){
      return fs.statSync(name).isDirectory();
  });
  if (!folders.length)return folders;
  if (parseInt(folders[0].shortname)) {
    folders.sort(function(a,b) {
      return parseInt(a.shortname)-parseInt(b.shortname);
    });
  } else {
    folders.sort(function(a,b) {
      if (a.shortname==b.shortname) return 0; 
      else if (a.shortname>b.shortname) return 1; else return -1;
    });
  }
  return folders;
};
var _files=function(path) {
  var fs=nodeRequire('fs');
  var files= getFiles( path,function(name){
      return name.indexOf(".kd")===name.length-3;
  });
  if (!files.length)return files;
  if (parseInt(files[0].shortname)) {
    files.sort(function(a,b) {
      return parseInt(a.shortname)-parseInt(b.shortname);
    });
  } else {
    files.sort(function(a,b) {
      if (a.shortname==b.shortname) return 0; 
      else if (a.shortname>b.shortname) return 1; else return -1;
    });
  }
  return files;
};

var _names=function() {
  var fs=nodeRequire('fs');
	//search for local 
	var folders= getFiles(['./ksana_databases','../ksana_databases','../../ksana_databases'],function(name){
      if (fs.statSync(name).isDirectory()){
        return fs.existsSync(name+'/ksana.json');
      }
  });

	return folders;
}

var fullInfo=function(projname) {
  var proj=_names().filter(function(f){ return f.shortname==projname});
  if (!proj.length) return [];
  var files=[];
  var ksana=JSON.parse(fs.readFileSync(proj[0].filename+'/ksana.json','utf8'));
  _folders(proj[0].filename).map(function(f){
    files=files.concat(files,_files(f.filename));
  })
  return {ksana:ksana, project:proj[0],files: files.map(function(f){return f.filename})};
}

module.exports={names:_names,folders:_folders,files:_files,fullInfo:allFiles};