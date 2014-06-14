var X=require('../xml4kdb');
console.log('xml4kdb test suite');
var fs=require('fs');
var Diff=require("../diff");

var createDocumentFromXml=function(fn) {
	var buf=fs.readFileSync(fn,"utf8");
	var res=X.parseXML(buf);
	var d=X.importJson(res);
	return d;
}
QUnit.test('import xml',function(){
	var d=createDocumentFromXml("xml4kdb-test.xml");
	equal(d.pageCount,3);
});
var showdiff=function(D) {
	var offset=0;
	D.map(function(d){
		if (!d[0]) {
			offset+=d[1].length;
			return;
		}
		if (d[0]==-1) offset+=d[1].length;
		console.log(offset,d[0],d[1]);
	})
}

QUnit.test('diff',function(){
	var d=createDocumentFromXml("xml4kdb-test.xml");
	var d2=createDocumentFromXml("xml4kdb-test2.xml");
	d.getPage(1).addMarkup(13,1,{type:"memo"});
	d.getPage(2).addMarkup(13,1,{type:"memo"});

	var diff=new Diff();
	var pc=d.pageCount;
	for (var i=1;i<pc;i++ ){
		var df=diff.diff_main(d.getPage(i).inscription, d2.getPage(i).inscription);
		d.getPage(i).addRevisionsFromDiff(df);
		d.evolvePage(d.getPage(i));
	};

	equal(d.getPage(3).getMarkup(0).start,16);
	equal(d.getPage(4).getMarkup(0).start,15);

})