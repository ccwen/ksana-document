var indexer=require("../indexer");
var mkdbconfig={
	name:"test"
	,config:"simple1"
	,files:["xml4kdb-test.xml"]
	,pageSeparator:"_.id"
	,format:"TEIP5"
	,reset:true
}

indexer.start(mkdbconfig);
