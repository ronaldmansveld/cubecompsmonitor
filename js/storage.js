(function() {

	function storage() {}

	storage.prototype.set = function(key, value) {
		window.localStorage.setItem(key, JSON.stringify(value));
	};

	storage.prototype.get = function(key) {
		var v = window.localStorage.getItem(key)
		return v ? JSON.parse(v) : null;
	};

	storage.prototype.clear = function() {
		window.localStorage.clear();
	};

	angular.module('ccm').service('storage', storage);
})()