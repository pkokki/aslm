var Account = require('./models/account');

module.exports = function(app) {

    app.get('/api/accounts/:accountName/solutions', function(req, res) {
        var accountName = req.params.accountName;

    	Account.find(function(err, accounts) {
    		if (err)
    			res.send(err)
    		res.json(accounts);
    	});
    });

};
