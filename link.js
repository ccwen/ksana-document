var findLinkBy=function(page,start,len,cb) {
	var markups=page.markupAt(start);
	cb(markups);
}
module.exports={findLinkBy:findLinkBy};