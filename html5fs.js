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

var readSyncronize=function(handle,length,position){
    var sliced=handle._buf.slice(position,position+length);
    return sliced;
}
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
var open=function(url,cb) {
    var handle={url:url};

    cb(handle);//url as handle
}
var load=function(filename,mode,cb) {
  open(filename,mode,cb,true);
}


module.exports={load:load,open:open,read:read,readSyncronize:readSyncronize,fstatSync:fstatSync,fstat:fstat,close:close}