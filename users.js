if (typeof nodeRequire=='undefined')nodeRequire=require;

var passwords=[];

var loadpasswd=function(){
	var defpasswdfilename='./passwd.json';
	var fs=nodeRequire('fs');
    if (fs.existsSync(defpasswdfilename)) {
    	passwords=JSON.parse(fs.readFileSync(defpasswdfilename,'utf8'));  
    }
}
var login=function(opts) {
	opts=opts||{};
	var password=opts.password||opts.pw;
	var out={name:opts.name,error:"user not found"};
	if (!passwords.length) loadpasswd();
	for (var i=0;i<passwords.length;i++) {
		var u=passwords[i];
		if (u.name==opts.name) {
			if (u.pw!=password) {
				out.error="wrong password";
			} else {
				out=JSON.parse(JSON.stringify(u));
				delete out.pw;
				out.error="";
				return out;
			}
		}
	}
	return out;
}
module.exports={login:login}