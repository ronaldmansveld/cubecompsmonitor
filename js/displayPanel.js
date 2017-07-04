(function() {
	function displayPanelController(storage, $http, $interval, $timeout, $sce) {
		this.storage = storage;
		this.$http = $http;
		this.$interval = $interval;
		this.$timeout = $timeout;
		this.$sce = $sce;

		this.state = {
			competition: null,
			events: [],
			announcements: [],
			videos: [],
			useLiveResults: false
		};
		this.title = '';

		this.currentDisplayItem = 'round';

		this.liveResultsInterval = null;
		this.liveResultsCompetitors = [];

		this.roundCounter = 0;

		this.results = [];
	}

	displayPanelController.$inject = ['storage', '$http', '$interval', '$timeout', '$sce'];

	displayPanelController.prototype.$onInit = function() {
		this.nextDisplayItem();
		this.startAnnouncements();
	};

	displayPanelController.prototype.nextDisplayItem = function() {
		this.loadState();
		if (this.state.useLiveResults) {
			this.currentDisplayItem = 'live-results';
			this.title = this.state.liveResultsTitle;
			this.liveResultsInterval = this.$interval(function(t) {t.loadLiveResults()}, 500, 0, true, this);
			return;
		}
		if (this.liveResultsInterval) {
			this.$interval.cancel(this.liveResultsInterval);
			this.liveResultsInterval = null;
		}
		switch (this.currentDisplayItem) {
			case 'round':
				this.displayRound();
				break;
			default:
				this.displayRound();
				break;
		}
	};

	displayPanelController.prototype.loadLiveResults = function() {
		this.loadState();
		if (!this.state.useLiveResults) {
			thi.currentDisplayItem = 'round';
			this.nextDisplayItem();
		}
		this.liveResultsCompetitors = (this.storage.get('ccm-live-results-competitors') || []).map(function(c) {
			if (c.t1 && c.t1 != 'DNF') c.t1 = c.t1.toFixed(2);
			if (c.t2 && c.t2 != 'DNF') c.t2 = c.t2.toFixed(2);
			if (c.t3 && c.t3 != 'DNF') c.t3 = c.t3.toFixed(2);
			if (c.t4 && c.t4 != 'DNF') c.t4 = c.t4.toFixed(2);
			if (c.t5 && c.t5 != 'DNF') c.t5 = c.t5.toFixed(2);
			return c;
		});
	};

	displayPanelController.prototype.displayRound = function() {
		_this = this;
		if (!this.state.competition || this.state.events.length === 0) {
			return window.setTimeout(function() {
				_this.displayRound();
			}, 2500);
		}
		if (this.roundCounter >= this.state.events.length) this.roundCounter = 0;
		var currentEvent = this.state.events[this.roundCounter];
		var parts = currentEvent.split('/');
		this.$http({
			method: 'get',
			url: 'http://m.cubecomps.com/competitions/'+this.state.competition+'/events/'+parts[0]+'/rounds/'+parts[1]+'/results.json'
		}).then(function (res) {
			_this.$http({
				method: 'get',
				url: 'http://m.cubecomps.com/competitions/'+_this.state.competition+'/events.json'
			}).then(function (res) {
				res.data.forEach(function (e) {
					if (e.rounds[0].event_id == parts[0]) {
						e.rounds.forEach(function (r) {
							if (r.id == parts[1]) {
								_this.title = e.name + ' - ' + r.name;
							}
						});
					}
				});
			});
			_this.results = res.data.map(function (r) {
				for (var i = 1; i <= 5; i++) {
					r['t' + i + '_not_counting'] = _this.isNotCounting(i, r);
				}
				return r;
			});
			window.setTimeout(function() {
				var lastScroll = window.scrollY, dir = 1;
				var t = window.setInterval(function() {
					lastScroll = window.scrollY;
					window.scrollTo(0, lastScroll + dir);
					if (window.scrollY == lastScroll) {
						window.setTimeout(function() { dir = -1; }, 5000);
					}
					if (dir == -1 && window.scrollY == 0) {
						window.clearInterval(t);
						_this.roundCounter++;
						if (_this.roundCounter >= _this.state.events.length) _this.roundCounter = 0;
						window.setTimeout(function() {_this.nextDisplayItem()}, 5000);
					}
				}, 32);
			}, 5000);
		});
	};

	displayPanelController.prototype.loadState = function() {
		var state = this.storage.get('ccm-data');
		if (state) this.state = state;
	};

	displayPanelController.prototype.isNotCounting = function(num, result) {
		if (result && !(result.average && result.average.trim())) {
			return false;
		}
		var time = result['t' + num].toString();
		if (time.trim() == '') return false;
		if (time === 'DNF') {
			switch (num) {
				case 1: return true;
				case 2: return result.t1 != 'DNF';
				case 3: return result.t1 != 'DNF' && result.t2 != 'DNF';
				case 4: return result.t1 != 'DNF' && result.t2 != 'DNF' && result.t3 != 'DNF';
				case 5: return result.t1 != 'DNF' && result.t2 != 'DNF' && result.t3 != 'DNF' && result.t4 != 'DNF';
			}
		}
		return time == result.best || this.toSeconds(time) == Math.max(this.toSeconds(result.t1), this.toSeconds(result.t2), this.toSeconds(result.t3), this.toSeconds(result.t4), this.toSeconds(result.t5));
	}

	displayPanelController.prototype.toSeconds = function(t) {
		if (!t) return 0;
		if (t.indexOf(':') === -1) return t;
		var p = t.split(':');
		return 60 * p[0] + p[1];
	}

	displayPanelController.prototype.startAnnouncements = function() {
		if (this.state.announcements.length == 0) {
			return this.$timeout(function(t) { t.startAnnouncements() }, 2500, true, this);
		}

		this.announcementsString = this.$sce.trustAsHtml(this.state.announcements.map(function (a) { return a.text }).join(' &nbsp; &nbsp; &mdash; &nbsp; &nbsp; '));
		var container = angular.element(document).find('ccm-announcements-container')[0];
		container.style.left = container.parentNode.offsetWidth + 'px';

		var timer = this.$interval(function(t) {
			if (parseInt(container.style.left) * -1 > container.scrollWidth) {
				t.$interval.cancel(timer);
				t.startAnnouncements();
			} else {
				container.style.left = (parseInt(container.style.left) - 1) + 'px';
			}
		}, 16, 0, true, this);
	}



	function displayPanel() {
		this.bindings = {};
		this.controller = displayPanelController;
		this.templateUrl = function() { return 'js/displayPanel.ng-template' };
	}

	angular.module('ccm').component('ccmDisplayPanel', new displayPanel());
})();