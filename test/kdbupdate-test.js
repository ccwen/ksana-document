
QUnit.asyncTest('import xml',function(){
    var indexer=require("ksana-document").indexer;
    var finalized=function() {
        start();
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

QUnit.test('import xml for update',function(){
    var indexer=require("ksana-document").indexer;
    copyfile("xml4kdb-test2.xml","xml4kdb-test.xml");
    var finalized=function() {
        copyfile("xml4kdb-test.bak","xml4kdb-test.xml");
        //start();
    }
    var config={
    name:"xml4kdb-test"
        ,config:"simple1"
        ,pageSeparator:"_.id"
        ,files:["xml4kdb-test.xml"]
        ,finalized:finalized.bind(this)
    }
    var session=indexer.start(config);
    equal(true,true)
});