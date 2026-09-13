import { test } from "node:test";
import assert from "node:assert/strict";
import { createInstaller } from "../src/installer.js";
import { createVerifier } from "../src/verifier.js";

const THING_ID = "no.sintef.sct.giot:gw1";
const OLD = "3.0.11-1~deb12u2";
const NEW = "3.0.14-1~deb12u2";
const silent = { info() {}, warn() {}, error() {} };

function twinWanting(version) {
  return {
    thingId: THING_ID,
    features: {
      softwareManagement: {
        desiredProperties: {
          packages: { openssl: { version, debs: ["openssl", "libssl3"], workflowId: "wf-1" } },
        },
      },
    },
  };
}

function fakeGateway({ installed = OLD, installExitCode = 0, verifyOutput = "" } = {}) {
  let version = installed;
  const commands = [];
  const exec = async (command) => {
    commands.push(command);
    if (command.startsWith("dpkg-query")) {
      return { code: 0, stdout: `openssl installed ${version}\nlibssl3 installed ${version}\n`, stderr: "" };
    }
    if (command.startsWith("apt-get update")) return { code: 0, stdout: "", stderr: "" };
    if (command.startsWith("apt-get install")) {
      if (installExitCode === 0) version = NEW;
      return { code: installExitCode, stdout: "", stderr: installExitCode ? "E: Broken packages" : "" };
    }
    if (command.startsWith("dpkg --verify")) return { code: 0, stdout: verifyOutput, stderr: "" };
    if (command === "openssl version") {
      const upstream = version.split("-")[0];
      return { code: 0, stdout: `OpenSSL ${upstream} 4 Jun 2024 (Library: OpenSSL ${upstream} 4 Jun 2024)\n`, stderr: "" };
    }
    if (command.startsWith("d=$(mktemp -d)")) return { code: 0, stdout: "", stderr: "" };
    if (command.startsWith("grep -ls")) return { code: 0, stdout: "", stderr: "" };
    return { code: 127, stdout: "", stderr: `unexpected command: ${command}` };
  };
  return { exec, commands };
}

function recorder() {
  const published = [];
  const publish = async (topic, message) => {
    published.push({ topic, message: JSON.parse(JSON.stringify(message)) });
  };
  const reported = (i) => published[i].message.features.softwareManagement.properties.packages.openssl;
  return { published, publish, reported };
}

test("installer upgrades the package set and reports progress through the twin", async () => {
  const gateway = fakeGateway();
  const out = recorder();
  const installer = createInstaller({ thingId: THING_ID, exec: gateway.exec, publish: out.publish, log: silent });
  await installer.handleTwin(twinWanting(NEW));

  assert.equal(out.published.length, 2);
  assert.equal(out.published[0].topic, `no.sintef.sct.giot.things/software-status/${THING_ID}`);
  assert.equal(out.reported(0).installationStatus, "installing");
  assert.equal(out.reported(0).verificationStatus, "pending");
  assert.equal(out.reported(1).installationStatus, "installed");
  assert.equal(out.reported(1).version, NEW);
  assert.ok(gateway.commands.some((c) => c.includes(`'openssl=${NEW}' 'libssl3=${NEW}'`)));
});

test("installer reports a failed installation with the version still installed", async () => {
  const gateway = fakeGateway({ installExitCode: 100 });
  const out = recorder();
  const installer = createInstaller({ thingId: THING_ID, exec: gateway.exec, publish: out.publish, log: silent });
  await installer.handleTwin(twinWanting(NEW));

  assert.equal(out.reported(1).installationStatus, "failed");
  assert.equal(out.reported(1).version, OLD);
  assert.match(out.reported(1).lastError, /apt-get install failed/);
});

test("installer skips apt when the desired version is already installed", async () => {
  const gateway = fakeGateway({ installed: NEW });
  const out = recorder();
  const installer = createInstaller({ thingId: THING_ID, exec: gateway.exec, publish: out.publish, log: silent });
  await installer.handleTwin(twinWanting(NEW));

  assert.equal(out.reported(1).installationStatus, "installed");
  assert.ok(!gateway.commands.some((c) => c.startsWith("apt-get")));
});

test("installer refuses versions that could inject shell commands", async () => {
  const gateway = fakeGateway();
  const out = recorder();
  const installer = createInstaller({ thingId: THING_ID, exec: gateway.exec, publish: out.publish, log: silent });
  await installer.handleTwin(twinWanting("3.0.14; rm -rf /"));

  assert.equal(out.reported(1).installationStatus, "failed");
  assert.match(out.reported(1).lastError, /refusing unsafe version/);
  assert.ok(!gateway.commands.some((c) => c.startsWith("apt-get")));
});

function installedStatus() {
  return {
    thingId: THING_ID,
    stage: "installation",
    workflowId: "wf-1",
    features: {
      softwareManagement: {
        desiredProperties: { packages: { openssl: { version: NEW, debs: ["openssl", "libssl3"] } } },
        properties: { packages: { openssl: { installationStatus: "installed", version: NEW } } },
      },
    },
  };
}

test("verifier passes an intact, working installation", async () => {
  const gateway = fakeGateway({ installed: NEW });
  const out = recorder();
  const verifier = createVerifier({ thingId: THING_ID, exec: gateway.exec, publish: out.publish, log: silent });
  await verifier.handleStatus(installedStatus());

  assert.equal(out.published.length, 1);
  assert.equal(out.published[0].message.stage, "verification");
  const reported = out.reported(0);
  assert.equal(reported.verificationStatus, "passed");
  assert.deepEqual(reported.verificationChecks, {
    dpkgState: true,
    fileIntegrity: true,
    binaryVersion: true,
    tlsHandshake: true,
  });
  assert.deepEqual(reported.restartRequired, []);
});

test("verifier fails when installed files do not match the package", async () => {
  const gateway = fakeGateway({ installed: NEW, verifyOutput: "??5?????? c /etc/ssl/openssl.cnf\n" });
  const out = recorder();
  const verifier = createVerifier({ thingId: THING_ID, exec: gateway.exec, publish: out.publish, log: silent });
  await verifier.handleStatus(installedStatus());

  assert.equal(out.reported(0).verificationStatus, "failed");
  assert.equal(out.reported(0).verificationChecks.fileIntegrity, false);
  assert.deepEqual(out.reported(0).verificationChecks.integrityIssues, ["??5?????? c /etc/ssl/openssl.cnf"]);
});

test("verifier ignores statuses of other stages and devices", async () => {
  const gateway = fakeGateway({ installed: NEW });
  const out = recorder();
  const verifier = createVerifier({ thingId: THING_ID, exec: gateway.exec, publish: out.publish, log: silent });
  await verifier.handleStatus({ ...installedStatus(), stage: "verification" });
  await verifier.handleStatus({ ...installedStatus(), thingId: "no.sintef.sct.giot:other" });

  assert.equal(out.published.length, 0);
});
