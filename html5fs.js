/*
http://stackoverflow.com/questions/3146483/html5-file-api-read-as-text-and-binary

automatic open file without user interaction
http://stackoverflow.com/questions/18251432/read-a-local-file-using-javascript-html5-file-api-offline-website

extension id
 chrome.runtime.getURL("vrimul.ydb")
"chrome-extension://nfdipggoinlpfldmfibcjdobcpckfgpn/vrimul.ydb"
 tell user to switch to the directory

 getPackageDirectoryEntry
*/

var read=function(handle,buffer,offset,length,position,cb) {	 //buffer and offset is not used
     var xhr = new XMLHttpRequest();
      xhr.open('GET', handle.url , true);
      var range=[position,length+position-1];
      xhr.setRequestHeader('Range', 'bytes='+range[0]+'-'+range[1]);
      xhr.responseType = 'arraybuffer';
      xhr.send();
      xhr.onload = function(e) {
          cb(0,this.response.byteLength,this.response);
      }; 
}

var close=function(handle) {
	//nop
}
var fstatSync=function(handle) {
  throw "not implement yet";
}
var fstat=function(handle,cb) {
  throw "not implement yet";
}
var _open=function(fn_url,cb) {
    var handle={};
    if (fn_url.indexOf("filesystem:")==0){
      handle.url=fn_url;
      handle.fn=fn_url.substr( fn_url.lastIndexOf("/")+1);
    } else {
      handle.fn=fn_url;
      var url=API.files.filter(function(f){ return (f[0]==fn_url)});
      if (url) handle.url=url[0][1];
    }
    cb(handle);//url as handle
}
var open=function(fn_url,cb) {
    if (!API.initialized) {init(1024*1024,this,function(){
      _open.apply(this,[fn_url,cb]);
    })} else _open.apply(this,[fn_url,cb]);
}
var load=function(filename,mode,cb) {
  open(filename,mode,cb,true);
}

var  get_downloadsize=function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("HEAD", url, true); // Notice "HEAD" instead of "GET", //  to get only the header
    xhr.onreadystatechange = function() {
      if (this.status!==200&&this.status!==206) {
         callback(0);//no such file
      }  else {
          if (this.readyState == this.DONE) {
            callback(parseInt(xhr.getResponseHeader("Content-Length")));
          }
      }
    };
    xhr.send();
};

var download=function(url,fn,context,cb,statuscb) {
   if (typeof context=="function" && typeof cb=="undfined") {
     cb=context, context=this;
   }
   var totalsize=0,batches=null;;
   var createBatches=function(size) {
      var bytes=1024*1024, out=[];
      var b=Math.floor(size / bytes);
      var last=size %bytes;
      for (var i=0;i<b;i++) {
        out.push(i*bytes);
      }
      out.push(b*bytes+last);
      return out;
   }
    var batch=function(b) {
       var xhr = new XMLHttpRequest();
       
       xhr.open('get', url, true);
       xhr.setRequestHeader('Range', 'bytes='+batches[b]+'-'+(batches[b+1]-1));
       xhr.responseType = 'blob';

       xhr.addEventListener('load', function() {
         var blob=this.response;
         API.fs.root.getFile(fn, {create: true, exclusive: false}, function(fileEntry) {
            fileEntry.createWriter(function(fileWriter) {
              fileWriter.seek(fileWriter.length);
              fileWriter.write(blob);
              fileWriter.onwriteend = function(e) {
                if (statuscb) statuscb.apply(context,[ fileWriter.length / totalsize,totalsize ]);
                b++;
                if (b<batches.length-1) {
                   setTimeout(batch.bind(this,b),0);
                } else if (cb) {
                    setTimeout( cb.bind(context,false) , 0) ; 
                }

              };
            }, console.error);
          }, console.error);
       },false);
       xhr.send();
    }
     //main
     get_downloadsize(url,function(size){
       totalsize=size;
       if (!size) {
          if (cb) cb.apply(context,[false]);
       } else {//ready to download
         batches=createBatches(size);
         if (statuscb) statuscb.apply(context,[ 0, totalsize ]);
         rm(fn,this,function(){
            batch(0);  //start start
         });                
      }
     });
}
var writeFile=function(filename,buf,context,cb){
   if (typeof context=="function" && typeof cb=="undfined") {
     cb=context, context=this;
   }
   API.fs.root.getFile(filename, {create: true, exclusive: true}, function(fileEntry) {
      fileEntry.createWriter(function(fileWriter) {
        fileWriter.write(buf);
        fileWriter.onwriteend = function(e) {
          if (cb) cb.apply(cb,[buf.byteLength]);
        };            
      }, console.error);
    }, console.error);
}

var readdir=function(context,cb) {
   if (typeof context=="function" && typeof cb=="undfined") {
     cb=context, context=this;
   }
   var dirReader = API.fs.root.createReader();
   var out=[],that=this;
    // Need to recursively read directories until there are no more results.
    dirReader.readEntries(function(entries) {
      if (entries.length) {
          for (var i = 0, entry; entry = entries[i]; ++i) {
            if (entry.isFile) {
              out.push([entry.name,entry.toURL ? entry.toURL() : entry.toURI()]);
            }
          }
      }
      API.files=out;
      if (cb) cb.apply(context,[out]);
    }, function(){
      if (cb) cb.apply(context,[null]);
    });
}
var getFileURL=function(filename) {
  if (!API.files ) return null;
  var file= API.files.filter(function(f){return f[0]==filename});
  if (file.length) return file[0][1];
}
var rm=function(filename,context,cb) {
   if (typeof context=="function" && typeof cb=="undfined") {
     cb=context, context=this;
   }
   var url=getFileURL(filename);
   if (url) rmURL(url,context,cb);
   else if (cb) cb.apply(context,[false]);
}

var rmURL=function(filename,context,cb) {
   if (typeof context=="function" && typeof cb=="undfined") {
     cb=context, context=this;
   }
    webkitResolveLocalFileSystemURL(filename, function(fileEntry) {
      fileEntry.remove(function() {
        if (cb) cb.apply(context,[true]);
      }, console.error);
    },  function(e){
      if (cb) cb.apply(context,[false]);//no such file
    });
}
var init=function(quota,context,cb) {

   if (typeof context=="function" && typeof cb=="undfined") {
     cb=context, context=this;
   }
  navigator.webkitPersistentStorage.requestQuota(quota, 
      function(grantedBytes) {
        webkitRequestFileSystem(PERSISTENT, grantedBytes,  function(fs) {
          API.fs=fs;
          API.quota=grantedBytes;
          readdir(context,function(){
            API.initialized=true;
            if (cb) cb.apply(context,[grantedBytes,fs]);
          })
      }, console.error );
    }, console.error);

}
if (typeof navigator!="undefined" && navigator.webkitPersistentStorage) init(1024*1024);
var API={
  load:load
  ,open:open
  ,read:read
  ,fstatSync:fstatSync
  ,fstat:fstat,close:close
  ,init:init
  ,readdir:readdir
  ,rm:rm
  ,rmURL:rmURL
  ,getFileURL:getFileURL
  ,writeFile:writeFile
  ,download:download}

  module.exports=API;