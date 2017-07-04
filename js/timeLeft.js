(function() {
	function timeLeftController($interval) {
		_this = this;
		this.timeLeft = '';
		this.$interval = $interval;
	}

	timeLeftController.$inject = ['$interval'];

	timeLeftController.prototype.$onInit = function() {
		this.time = new Date(this.time);
		this.updateTimeLeft();
		this.timer = this.$interval(function(t) {t.updateTimeLeft()}, 1000, 0, true, this);
	}

	timeLeftController.prototype.updateTimeLeft = function() {
		var d = new Date();
		var h = this.time.getHours() - d.getHours();
		var m = this.time.getMinutes()- d.getMinutes();
		var s = this.time.getSeconds() - d.getSeconds();

		if (s < 0) {
			s += 60;
			m--;
		}
		if (m < 0) {
			m += 60;
			h--;
		}

		var t = '';
		if (h > 0) t += h.toString().padStart(2, '0') + ':';
		t += m.toString().padStart(2, '0') + ':';
		t += s.toString().padStart(2, '0');
		this.timeLeft = t;
	}

	function timeLeft() {
		this.bindings = {
			time: '<'
		};
		this.controller = timeLeftController;
		this.template = '<span>{{$ctrl.timeLeft}}</span>';
	}

	angular.module('ccm').component('ccmTimeLeft', new timeLeft());
})();