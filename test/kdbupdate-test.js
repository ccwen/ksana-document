var Kde=require("../kde");

QUnit.asyncTest('import xml',function(){
    var indexer=require("ksana-document").indexer;
    //stop();
    var that=this;
    var finalized=function() {
        start.call(that);
    }
    var config={
	name:"xml4kdb-test"
	,config:"simple1"
	,pageSeparator:"_.id"
    	,files:["xml4kdb-test.xml"]
            ,reset:true
            ,finalized:finalized.bind(this)
    }
    var session=indexer.start(config);
    if (!session) {
      console.log("failed to create kdb");
      return;
    }
    equal(true,true)
});
var copyfile=function(src,target){
    var fs=require('fs');
    fs.writeFileSync(target, fs.readFileSync(src));
}

QUnit.asyncTest('import xml for update',function(){
    var indexer=require("ksana-document").indexer;
    copyfile("xml4kdb-test2.xml","xml4kdb-test.xml");
    var that=this;
    //stop();
    var finalized=function() {
        copyfile("xml4kdb-test.bak","xml4kdb-test.xml");
        start.call(that);
    }
    var config={
    name:"xml4kdb-test"
        ,config:"simple1"
        ,pageSeparator:"_.id"
        ,files:["xml4kdb-test.xml"]
        ,finalized:finalized.bind(this)
        ,nobackup:true
    }
    var session=indexer.start(config);
    equal(true,true)
});

QUnit.asyncTest("test kdb",function(){
    var that=this;
    Kde.openLocal("xml4kdb-test",function(db){
        db.getDocument("xml4kdb-test.xml",function(doc){    
            start();
            equal.apply(that,[doc.getPage(2).inscription,"\n第一頁第一行\n第一頁第二行\n"]);
        })
    });
     equal(true,true)
})