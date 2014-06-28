var outback = function (s) {
    while (s.length < 70) s += ' ';
    var l = s.length; 
    for (var i = 0; i < l; i++) s += String.fromCharCode(8);
    process.stdout.write(s);
}
var movefile=function(sourcefn,targetfolder) {
	var fs = require("fs");
	var source = fs.createReadStream(sourcefn);
	var path=require("path");
	var targetfn=path.resolve(process.cwd(),"..")+path.sep+path.basename(sourcefn);
	var destination = fs.createWriteStream(targetfn);
	console.log(targetfn);
	source.pipe(destination, { end: false });
	source.on("end", function(){
	    fs.unlinkSync(sourcefn);
	});
	return targetfn;
}
var mkdbjs="mkdb.js";
var build=function(path){
  var fs=require("fs");

  if (!fs.existsSync(mkdbjs)) {
      throw "no "+mkdbjs  ;
  }
  var starttime=new Date();
  console.log("START",starttime);
  if (!path) path=".";
  var fn=require("path").resolve(path,mkdbjs);
  var mkdbconfig=require(fn);
  var glob = require("glob");
  var indexer=require("ksana-document").indexer;
  var timer=null;

  glob(mkdbconfig.glob, function (err, files) {
    if (err) {
      throw err;
    }
    mkdbconfig.files=files.sort();
    var session=indexer.start(mkdbconfig);
    if (!session) {
      console.log("No file to index");
      return;
    }
    timer=setInterval( getstatus, 1000);
  });
  var getstatus=function() {
    var status=indexer.status();
    outback((Math.floor(status.progress*1000)/10)+'%'+status.message);
    if (status.done) {
    	var endtime=new Date();
    	console.log("END",endtime, "elapse",(endtime-starttime) /1000,"seconds") ;
      //status.outputfn=movefile(status.outputfn,"..");
      clearInterval(timer);
    }
  }
}

module.exports=build;