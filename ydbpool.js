if (typeof nodeRequire=='undefined')nodeRequire=require;
var pool={};

var open=function(ydbid)  {
	var fs=nodeRequire('fs');
	var Y=nodeRequire('ksana-document').ydb;
	var ydb=pool[ydbid];
	if (ydb) return ydb;

	var ydbfn=ydbid+'.ydb';

	var tries=["./"+ydbfn,
	           "./ksana_databases/"+ydbfn,
	           "../ksana_databases/"+ydbfn,
	           "../../ksana_databases/"+ydbfn];

	for (var i=0;i<tries.length;i++) {
		if (fs.existsSync(tries[i])) {
			ydb=new Y(tries[i]);
			if (ydb) {
				pool[ydbid]=ydb;
				return ydb;
			}
		}
	}
	return null;
}


module.exports={open:open};