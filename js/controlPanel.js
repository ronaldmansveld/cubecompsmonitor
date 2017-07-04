(function() {
	function controlPanelController(storage, $http, $interval) {
		this.storage = storage;
		this.$http = $http;
		this.$interval = $interval;

		this.state = {
			competition: null,
			events: [],
			announcements: [],
			videos: [],
			useLiveResults: false,
			liveResultsTitle: ''
		};
		this.competitions = {
			in_progress: [],
			past: [],
			upcoming: []
		};
		this.editState = 'competition';
		this.liveResultsCompetitors = [];
	}

	controlPanelController.$inject = ['storage', '$http', '$interval'];

	controlPanelController.prototype.$onInit = function() {
		this.loadState();
		this.loadCompetitions();
		if (this.state.competition) {
			this.loadEvents();
		}
		this.liveResultsCompetitors = this.storage.get('ccm-live-results-competitors') || [];
		this.cleanTimer = this.$interval(function(t) { t.cleanAnnouncements(); }, 1000, 0, true, this);
	};

	controlPanelController.prototype.loadCompetitions = function() {
		_this = this;
		this.$http({
			method: 'get',
			url: 'http://m.cubecomps.com/competitions.json'
		}).then(function (res) {
			_this.competitions = res.data;
		});
	};

	controlPanelController.prototype.changeCompetition = function() {
		this.state.events = [];
		this.persistState();
		this.loadEvents();

	};

	controlPanelController.prototype.loadEvents = function() {
		_this = this;
		this.events = [];
		this.$http({
			method: 'get',
			url: 'http://m.cubecomps.com/competitions/'+this.state.competition+'/events.json'
		}).then(function (res) {
			_this.events = res.data;
		});
	};

	controlPanelController.prototype.checkEvent = function(eventId, roundId) {
		var id = eventId + '/' + roundId;
		if (this.state.events.indexOf(id) > -1) {
			this.state.events.splice(this.state.events.indexOf(id), 1);
		} else {
			this.state.events.push(id);
		}
		this.persistState();
	}

	controlPanelController.prototype.persistState = function() {
		this.storage.set('ccm-data', this.state);
	};

	controlPanelController.prototype.loadState = function() {
		var state = this.storage.get('ccm-data');
		if (state) this.state = state;
	};

	controlPanelController.prototype.addAnnouncement = function() {
		var t = window.prompt('Enter the text for the announcement');
		var m = window.prompt('Enter the number of minutes to display the announcement for');
		var d = new Date();
		d.setMinutes(d.getMinutes() + parseInt(m, 10));

		this.state.announcements.push({
			text: t,
			time: d
		});

		this.persistState();
	};

	controlPanelController.prototype.editAnnouncement = function($index) {
		var a = this.state.announcements[$index];
		var d = new Date();
		var e = new Date(a.time);
		var h = e.getHours() - d.getHours();
		var m = e.getMinutes() - d.getMinutes();
		var s = (60 * h) + m;
		var t = window.prompt('Enter the text for the announcement', a.text);
		var m = window.prompt('Enter the number of minutes to display the announcement for', s);
		d.setMinutes(d.getMinutes() + parseInt(m, 10));

		this.state.announcements[$index] = {
			text: t,
			time: d
		};

		this.persistState();
	};

	controlPanelController.prototype.removeAnnouncement = function($index) {
		this.state.announcements.splice($index, 1);
		this.persistState();
	};

	controlPanelController.prototype.setEditState = function(state) {
		this.editState = state;
	};

	controlPanelController.prototype.cleanAnnouncements = function() {
		this.state.announcements = this.state.announcements.filter(function(a) {
			var d = new Date(a.time);
			var n = new Date();
			return d > n;
		});
		this.persistState();
	};

	controlPanelController.prototype.addNewLiveCompetitor = function() {
		var name = window.prompt("Name for competitor:");
		this.liveResultsCompetitors.push({
			name: name,
			t1: null,
			t1_not_counting: false,
			t2: null,
			t2_not_counting: false,
			t3: null,
			t3_not_counting: false,
			t4: null,
			t4_not_counting: false,
			t5: null,
			t5_not_counting: false,
			average: null
		});
		this.storage.set('ccm-live-results-competitors', this.liveResultsCompetitors);
	};

	controlPanelController.prototype.removeLiveCompetitor = function($index) {
		this.liveResultsCompetitors.splice($index, 1);
		this.storage.set('ccm-live-results-competitors', this.liveResultsCompetitors);
	}

	controlPanelController.prototype.updateLiveResults = function() {
		var _this = this;
		this.liveResultsCompetitors = this.liveResultsCompetitors.map(function(c) {
			c.t1 = c.t1 ? (c.t1 == 'DNF' || c.t1 == '/' ? 'DNF' : parseFloat(c.t1, 10)) : null;
			c.t2 = c.t2 ? (c.t2 == 'DNF' || c.t2 == '/' ? 'DNF' : parseFloat(c.t2, 10)) : null;
			c.t3 = c.t3 ? (c.t3 == 'DNF' || c.t3 == '/' ? 'DNF' : parseFloat(c.t3, 10)) : null;
			c.t4 = c.t4 ? (c.t4 == 'DNF' || c.t4 == '/' ? 'DNF' : parseFloat(c.t4, 10)) : null;
			c.t5 = c.t5 ? (c.t5 == 'DNF' || c.t5 == '/' ? 'DNF' : parseFloat(c.t5, 10)) : null;

			if (c.t1 && c.t2 && c.t3 && c.t4 && c.t5) {
				var max = Math.max(c.t1, c.t2, c.t3, c.t4, c.t5);
				var min = Math.min.apply(null, [c.t1, c.t2, c.t3, c.t4, c.t5].filter(function(e) {return e != 'DNF'}));
				c.average = _this.calcAvg(c.t1, c.t2, c.t3, c.t4, c.t5);
				for (var i = 1; i <= 5; i++) {
					var time = c['t'+i];
					if (time === 'DNF') {
						switch (i) {
							case 1: c.t1_not_counting = true;
							case 2: c.t2_not_counting = c.t1 != 'DNF';
							case 3: c.t3_not_counting = c.t1 != 'DNF' && c.t2 != 'DNF';
							case 4: c.t4_not_counting = c.t1 != 'DNF' && c.t2 != 'DNF' && c.t3 != 'DNF';
							case 5: c.t5_not_counting = c.t1 != 'DNF' && c.t2 != 'DNF' && c.t3 != 'DNF' && c.t4 != 'DNF';
						}
					} else {
						c['t'+i+'_not_counting'] = (time == min || time == max)
					}
				}
			} else {
				c.average = null;
				c.t1_not_counting = false;
				c.t2_not_counting = false;
				c.t3_not_counting = false;
				c.t4_not_counting = false;
				c.t5_not_counting = false;
			}

			return c;
		}).sort(function (a, b) {
			var a1 = a.t1 ? (a.t1 == 'DNF' || a.t1 == '/' ? 'DNF' : parseFloat(a.t1, 10)) : null;
			var a2 = a.t2 ? (a.t2 == 'DNF' || a.t2 == '/' ? 'DNF' : parseFloat(a.t2, 10)) : null;
			var a3 = a.t3 ? (a.t3 == 'DNF' || a.t3 == '/' ? 'DNF' : parseFloat(a.t3, 10)) : null;
			var a4 = a.t4 ? (a.t4 == 'DNF' || a.t4 == '/' ? 'DNF' : parseFloat(a.t4, 10)) : null;
			var a5 = a.t5 ? (a.t5 == 'DNF' || a.t5 == '/' ? 'DNF' : parseFloat(a.t5, 10)) : null;
			var b1 = b.t1 ? (b.t1 == 'DNF' || b.t1 == '/' ? 'DNF' : parseFloat(b.t1, 10)) : null;
			var b2 = b.t2 ? (b.t2 == 'DNF' || b.t2 == '/' ? 'DNF' : parseFloat(b.t2, 10)) : null;
			var b3 = b.t3 ? (b.t3 == 'DNF' || b.t3 == '/' ? 'DNF' : parseFloat(b.t3, 10)) : null;
			var b4 = b.t4 ? (b.t4 == 'DNF' || b.t4 == '/' ? 'DNF' : parseFloat(b.t4, 10)) : null;
			var b5 = b.t5 ? (b.t5 == 'DNF' || b.t5 == '/' ? 'DNF' : parseFloat(b.t5, 10)) : null;
			//neither have averages:
			if ((!a.average || a.average == 'DNF') && (!b.average || b.average == 'DNF')) {
				var ba = Math.min.apply(null, [a1, a2, a3, a4, a5].filter(function(e) {return e != 'DNF' && e > 0}));
				var bb = Math.min.apply(null, [b1, b2, b3, b4, b5].filter(function(e) {return e != 'DNF' && e > 0}));
				if (ba < bb) return -1;
				if (ba > bb) return 1;
				var ca = Math.min.apply(null, [a1, a2, a3, a4, a5].filter(function(e) {return e != 'DNF' && e > 0 && e != ba}));
				var cb = Math.min.apply(null, [b1, b2, b3, b4, b5].filter(function(e) {return e != 'DNF' && e > 0 && e != bb}));
				if (ca < cb) return -1;
				if (ca > cb) return 1;
				var da = Math.min.apply(null, [a1, a2, a3, a4, a5].filter(function(e) {return e != 'DNF' && e > 0 && e != ba && e != ca}));
				var db = Math.min.apply(null, [b1, b2, b3, b4, b5].filter(function(e) {return e != 'DNF' && e > 0 && e != bb && e != cb}));
				if (da < db) return -1;
				if (da > db) return 1;
				var ea = Math.min.apply(null, [a1, a2, a3, a4, a5].filter(function(e) {return e != 'DNF' && e > 0 && e != ba && e != ca && e != da}));
				var eb = Math.min.apply(null, [b1, b2, b3, b4, b5].filter(function(e) {return e != 'DNF' && e > 0 && e != bb && e != cb && e != db}));
				if (ea < eb) return -1;
				if (ea > eb) return 1;
				var fa = Math.min.apply(null, [a1, a2, a3, a4, a5].filter(function(e) {return e != 'DNF' && e > 0 && e != ba && e != ca && e != da && e != ea}));
				var fb = Math.min.apply(null, [b1, b2, b3, b4, b5].filter(function(e) {return e != 'DNF' && e > 0 && e != bb && e != cb && e != db && e != eb}));
				if (fa < fb) return -1;
				if (fa > fb) return 1;
				return a.name < b.name ? -1 : 1;
			}

			//only one has average
			if (a.average && a.average != 'DNF' && (!b.average || b.average == 'DNF')) return -1;
			if (b.average && b.average != 'DNF' && (!a.average || a.average == 'DNF')) return 1;

			//both have averages:
			var x = parseFloat(a.average, 10);
			var y = parseFloat(b.average, 10);
			if (x < y) return -1;
			if (x > y) return 1;
			var ba = Math.min.apply(null, [a1, a2, a3, a4, a5].filter(function(e) {return e != 'DNF' && e > 0}));
			var bb = Math.min.apply(null, [b1, b2, b3, b4, b5].filter(function(e) {return e != 'DNF' && e > 0}));
			if (ba < bb) return -1;
			if (ba > bb) return 1;
			var ca = Math.min.apply(null, [a1, a2, a3, a4, a5].filter(function(e) {return e != 'DNF' && e > 0 && e != ba}));
			var cb = Math.min.apply(null, [b1, b2, b3, b4, b5].filter(function(e) {return e != 'DNF' && e > 0 && e != bb}));
			if (ca < cb) return -1;
			if (ca > cb) return 1;
			var da = Math.min.apply(null, [a1, a2, a3, a4, a5].filter(function(e) {return e != 'DNF' && e > 0 && e != ba && e != ca}));
			var db = Math.min.apply(null, [b1, b2, b3, b4, b5].filter(function(e) {return e != 'DNF' && e > 0 && e != bb && e != cb}));
			if (da < db) return -1;
			if (da > db) return 1;
			var ea = Math.min.apply(null, [a1, a2, a3, a4, a5].filter(function(e) {return e != 'DNF' && e > 0 && e != ba && e != ca && e != da}));
			var eb = Math.min.apply(null, [b1, b2, b3, b4, b5].filter(function(e) {return e != 'DNF' && e > 0 && e != bb && e != cb && e != db}));
			if (ea < eb) return -1;
			if (ea > eb) return 1;
			var fa = Math.min.apply(null, [a1, a2, a3, a4, a5].filter(function(e) {return e != 'DNF' && e > 0 && e != ba && e != ca && e != da && e != ea}));
			var fb = Math.min.apply(null, [b1, b2, b3, b4, b5].filter(function(e) {return e != 'DNF' && e > 0 && e != bb && e != cb && e != db && e != eb}));
			if (fa < fb) return -1;
			if (fa > fb) return 1;
			return 0;
		});
		this.storage.set('ccm-live-results-competitors', this.liveResultsCompetitors);
	};

	controlPanelController.prototype.calcAvg = function(t1, t2, t3, t4, t5) {
		var average = null;
		var numDNFs = 0;
		if (t1 == 'DNF') {
			numDNFs++;
			t1 = 99999;
		}
		if (t2 == 'DNF') {
			numDNFs++;
			t2 = 99999;
		}
		if (t3 == 'DNF') {
			numDNFs++;
			t3 = 99999;
		}
		if (t4 == 'DNF') {
			numDNFs++;
			t4 = 99999;
		}
		if (t5 == 'DNF') {
			numDNFs++;
			t5 = 99999;
		}
		if (numDNFs > 1) return 'DNF';
		var min = Math.min(t1, t2, t3, t4, t5);
		var max = Math.max(t1, t2, t3, t4, t5);
		var average = (t1 + t2 + t3 + t4 + t5 - min - max) / 3;
		return average.toFixed(2);
	}



	function controlPanel() {
		this.bindings = {};
		this.controller = controlPanelController;
		this.templateUrl = function() { return 'js/controlPanel.ng-template' };
	}

	angular.module('ccm').component('ccmControlPanel', new controlPanel());
})();