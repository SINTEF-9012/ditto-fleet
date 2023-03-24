This project is a Digital Twin platform for software management on a fleet of devices within the IoT-Edge-Cloud continuum. The backbone of the platform is [https://www.eclipse.org/ditto/](Eclipse Ditto). The platform also comes with a back-end, which listens for changes in the managed digital twins.

## Docker

### Stand-alone Docker container

To run the GUI please pull the latest version of the `dautov:ditto-fleet-gui` image and run the following command:

`docker run -it -p 3000:3000 rdautov:ditto-fleet-gui`

This will run the `npm start` script and launch the React application. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Together with Eclipse Ditto and back-end via Docker-Compose (recommended)

TODO
