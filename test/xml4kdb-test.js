var X=require('../xml4kdb');
var D=require('../document');
console.log('xml4kdb test suite');
var fs=require('fs');
var Diff=require("../diff");

var createDocumentFromXml=function(fn) {
	var buf=fs.readFileSync(fn,"utf8").replace(/\r\n/g,'\n');
	var res=X.parseXML(buf);
	var d=X.importJson(res);
	return d;
}
QUnit.test('import xml',function(){
	var d=createDocumentFromXml("xml4kdb-test.xml");
	equal(d.pageCount,5);
});

QUnit.test('diff',function(){
	var d=createDocumentFromXml("xml4kdb-test.xml");
	var d2=createDocumentFromXml("xml4kdb-test2.xml");  //updated xml
	d.getPage(2).addMarkup(13,1,{type:"memo"}); //行
	d.getPage(3).addMarkup(14,1,{type:"memo"}); //行

	var diff=new Diff();
	var pc=d.pageCount;
	for (var i=1;i<pc;i++ ){
		var df=diff.diff_main(d.getPage(i).inscription, d2.getPage(i).inscription);
		d.getPage(i).addRevisionsFromDiff(df);
		d.evolvePage(d.getPage(i));
	};

	equal(d.getPage(6).getMarkup(0).start,16);
	equal(d.getPage(7).getMarkup(0).start,15);

});


QUnit.test('export',function(){
	var d=createDocumentFromXml("xml4kdb-test.xml");
	var pc=d.pageCount;
	d.getPage(2).addRevision(11,0,"abc");

	d.getPage(3).addRevision(1,2,"第");
	d.getPage(3).addRevision(5,1,"");
	d.getPage(3).addRevision(13,0,"xyz");
	d.getPage(3).addRevision(15,0,"。");

	d.getPage(4).addRevision(3,0,"k");
	d.getPage(4).addRevision(5,0,"z");
	
	d.evolvePage(d.getPage(2));
	d.evolvePage(d.getPage(3));
	d.evolvePage(d.getPage(4));

   
	var xml=X.exportXML(d);

	var buf=fs.readFileSync("xml4kdb-test2.xml","utf8").replace(/\r\n/g,"\n");

	//add some changes with revision
	equal(xml,buf)
	//migrate xml tags
	//export
});

//enum by page name, return lastest version
QUnit.test('page map',function(){
	var doc=D.createDocument();
	var p1=doc.createPage({n:"p1",t:"content of page 1"});
	var p2=doc.createPage({n:"p2",t:"content of page 2"});

	p1.addRevision(0,0,"new ");
	p2.addRevision(0,0,"new ");

	doc.evolvePage(p1);
	doc.evolvePage(p2);

	
	equal(doc.getPage(3).inscription,"new content of page 1");
	equal(doc.getPage(4).inscription,"new content of page 2");
	
	doc.getPage(3).addRevision(3,0,"est");
	doc.evolvePage(doc.getPage(3));

	var p3=doc.createPage({n:"p3",t:"content of page 3"});

	var pagenames=[];
	var inscriptions=[];
	doc.map(function(page){
		pagenames.push(page.name);
		inscriptions.push(page.inscription);
	});
	var names=["p1","p2","p3"];
	deepEqual(pagenames,names);
	deepEqual(inscriptions,["newest content of page 1","new content of page 2","content of page 3"]);

	deepEqual(doc.pageNames(),names);

});