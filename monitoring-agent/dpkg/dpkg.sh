#!/bin/sh
## DPKG_ADMINDIR must point at the host's database (e.g. /hostfs/var/lib/dpkg) when running in a container
packages=$(dpkg-query --admindir="${DPKG_ADMINDIR:-/var/lib/dpkg}" -W -f '{"name":"${binary:Package}","version":"${Version}"},')
packages=[${packages%?}] ## remove trailing comma and add square brackets for json array
#packages={"packages"=[${packages%?}]} ## remove trailing comma
#echo -n $packages | jq -Rsa .
packages=$(echo -n $packages | jq -Rsa .)
#packages="{ \"packages\" : {$packages | jq -Rsa .}}"
packages={\"packages\":$packages} ## this is needed if we want a json object, not an array

echo $packages
