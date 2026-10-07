(function () {
  'use strict';
  var XZ = window.XZ;
  function updateGlobalUI(state) {
    var host = document.getElementById('resources'); host.textContent = '';
    host.appendChild(XZ.ui.resources(state.resources));
    document.getElementById('storage-notice').hidden = XZ.state.storageAvailable();
  }
  XZ.state.subscribe(updateGlobalUI);
  XZ.state.load();
  XZ.router.go('start');
  var loadHint = document.getElementById('load-hint');
  if (loadHint) { loadHint.parentNode.removeChild(loadHint); }
}());
