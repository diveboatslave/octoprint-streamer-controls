import flask
import requests

import octoprint.plugin
from octoprint.access.permissions import Permissions


class StreamerControlPlugin(
    octoprint.plugin.SettingsPlugin,
    octoprint.plugin.TemplatePlugin,
    octoprint.plugin.AssetPlugin,
    octoprint.plugin.SimpleApiPlugin,
):
    def get_settings_defaults(self):
        return {"url": "http://192.168.1.6:8000/streamer"}

    def get_assets(self):
        return {"js": ["js/streamercontrol.js"]}

    def get_template_configs(self):
        # Rendered as generic and moved below the webcam in the Control tab by the JS
        return [{"type": "generic", "template": "streamercontrol.jinja2", "custom_bindings": True}]

    def get_api_commands(self):
        return {"start": [], "stop": []}

    def on_api_command(self, command, data):
        if not Permissions.CONTROL.can():
            flask.abort(403)

        url = self._settings.get(["url"])
        try:
            r = requests.get(url, params={"op": command}, timeout=5)
            r.raise_for_status()
        except requests.RequestException as e:
            self._logger.error("Streamer %s failed: %s", command, e)
            return flask.jsonify(ok=False, error=str(e)), 502

        self._logger.info("Streamer %s: HTTP %s", command, r.status_code)
        self._plugin_manager.send_plugin_message(self._identifier, {"op": command})
        return flask.jsonify(ok=True, status=r.status_code, response=r.text[:500])


__plugin_name__ = "Streamer Control"
__plugin_pythoncompat__ = ">=3.7,<4"
__plugin_implementation__ = StreamerControlPlugin()
