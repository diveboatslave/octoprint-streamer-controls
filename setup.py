from setuptools import setup

setup(
    name="OctoPrint-StreamerControl",
    version="0.1.0",
    description="Sidebar panel with buttons to start and stop the streamer",
    packages=["octoprint_streamercontrol"],
    include_package_data=True,
    package_data={"octoprint_streamercontrol": ["templates/*", "static/js/*"]},
    install_requires=["requests"],
    entry_points={"octoprint.plugin": ["streamercontrol = octoprint_streamercontrol"]},
)
