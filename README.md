This project is a Digital Twin platform for software management on a fleet of devices within the IoT-Edge-Cloud continuum. The backbone of the platform is [Eclipse Ditto](https://www.eclipse.org/ditto/). The platform also comes with a back-end, which listens for changes in the managed digital twins.

## Pre-requisites: Installing and running Eclipse Ditto

This fleet management tool builds upon and further extends the functionality of Eclipse Ditto - an open source framework for building digital twins of devices connected to the internet. More information can be found [here](https://eclipse.dev/ditto/).

The best way to install and run Eclipse Ditto is via docker-compose, as fully described [here](https://github.com/eclipse-ditto/ditto/tree/master/deployment/docker). 

`git clone https://CI-CySec.eng.it/gitlab/ERATOSTHENES/dta.git`

`cd ditto/deployment/docker`

`docker-compose up -d`

## Running from source-code

The fleet management tool essentially consists of two separate components:

#### Front-end GUI

In the root folder: `npm run start`

#### Back-end API for interacting with Eclipse Ditto and MQTT communication with downstream devices

In a separate terminal change folder: `cd backend` and run: `npm run start`

## Runing as a Docker container

### Stand-alone Docker container

To run the GUI  pull the latest version of the `dautov:ditto-fleet-gui` image and run the following command:

`docker run -it -p 3000:3000 rdautov:ditto-fleet-gui`

This will run the `npm start` script and launch the React application. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.
