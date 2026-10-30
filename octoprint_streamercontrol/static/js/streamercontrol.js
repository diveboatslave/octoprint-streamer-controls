$(function () {
    function StreamerControlViewModel(parameters) {
        var self = this;

        const TRANSPARENT_GIF =
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        const RETRY_INTERVAL = 1000;
        const RETRY_LIMIT = 15;

        self.webcam = parameters[0];
        self.busy = ko.observable(false);
        self.status = ko.observable("");
        self.retryTimer = undefined;

        self.send = function (op) {
            self.busy(true);
            self.status("Sending " + op + "...");
            OctoPrint.simpleApiCommand("streamercontrol", op)
                .done(function () {
                    self.status("Streamer " + op + " OK");
                })
                .fail(function (xhr) {
                    var err = (xhr.responseJSON && xhr.responseJSON.error) || xhr.statusText;
                    self.status("Streamer " + op + " failed: " + err);
                })
                .always(function () {
                    self.busy(false);
                });
        };

        // Move only after all bindings are applied, otherwise controlViewModel would
        // also try to bind our panel once it is inside #control
        self.onAllBound = function () {
            var panel = $("#sidebar_plugin_streamercontrol_wrapper");
            var webcam = $("#webcam_plugins_container");
            if (webcam.length) {
                panel.insertAfter(webcam);
            } else {
                panel.prependTo("#control");
            }
            panel.show();
        };

        self.start = function () { self.send("start"); };
        self.stop = function () { self.send("stop"); };

        // Broadcast by the backend after a successful start/stop, so every open tab updates
        self.onDataUpdaterPluginMessage = function (plugin, data) {
            if (plugin !== "streamercontrol" || !self.webcam) return;
            if (data.op === "start") {
                self._reconnectWebcam();
            } else if (data.op === "stop") {
                self._blankWebcam();
            }
        };

        self._cancelRetry = function () {
            if (self.retryTimer !== undefined) {
                clearTimeout(self.retryTimer);
                self.retryTimer = undefined;
            }
        };

        // An MJPEG <img> freezes on the last frame when the stream stops, so blank it
        // ourselves; the classic webcam view model then shows its "not loaded" state
        self._blankWebcam = function () {
            self._cancelRetry();
            self.webcam.webcamLoaded(false);
            $("#webcam_image").attr("src", TRANSPARENT_GIF);
        };

        // The streamer may take a moment to come up, so keep reloading the stream
        // until it loads or we run out of attempts
        self._reconnectWebcam = function () {
            self._cancelRetry();
            var attempts = 0;

            var reload = function () {
                self.webcam.webcamError(false);
                self.webcam.onWebcamRefresh();
            };

            var check = function () {
                if (self.webcam.webcamLoaded()) {
                    self.retryTimer = undefined;
                    return;
                }
                if (++attempts > RETRY_LIMIT) {
                    self.retryTimer = undefined;
                    return;
                }
                if (self.webcam.webcamError()) {
                    reload();
                }
                self.retryTimer = setTimeout(check, RETRY_INTERVAL);
            };

            self.webcam.webcamLoaded(false);
            self.retryTimer = setTimeout(function () {
                reload();
                self.retryTimer = setTimeout(check, RETRY_INTERVAL);
            }, RETRY_INTERVAL);
        };
    }

    OCTOPRINT_VIEWMODELS.push({
        construct: StreamerControlViewModel,
        dependencies: ["classicWebcamViewModel"],
        optional: ["classicWebcamViewModel"],
        elements: ["#sidebar_plugin_streamercontrol_wrapper"]
    });
});
