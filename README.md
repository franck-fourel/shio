Shio is a deployment tool.  The name comes from the Japanese word for the tide and refers to 

1. http://www.tidepool.org the organization that it was originally developed for
1. The fact that deployments happen in waves -- ok, I just made that up

As a deployment tool, shio is opinionated software and is best used if you agree with those opinions.  These opinions, or religion, are described first in this document and then we go into how to interact with shio.  The readme ends with how to set up the system.

## Religion

Shio attempts to create a safe environment for developers to work in and have control of their application without stepping on the toes of system administrators.  Namely, we believe that

* Deploys should be repeatable
* `apt-get`, `yum` and other package management tools exist for system administrators, not developers
* Configuration should be merged with code at deploy time
* A developer should have the ability to depend on whatever library they feel is best
* A deployable artifact should be versioned and never change
* Once built, a deployable artifact should never have to be built again
* It is a developer's job to make sure that application dependencies are present
* It is a system administrator's job to make sure that they provide a stable, consistent operating system with verified, stable base software.

## How it works

Shio operates by combining "deployable tarballs" with "config tarballs" and running the application, described in order below.

### Deployable Tarballs

A deployable tarball is a `tar.gz` file with *all* application dependencies (minus system-dependencies) bundled into it.  That sentence has two concepts that require a definition:

* ***system dependency*** - A system dependency is something that is installed on all machines in your infrastructure.  It is assumed to exist as a part of the system rather than a part of the application.  The idea is that your operations team will have one or more canonical machine images and these things are already is installed on those images.  These are most commonly things like java, python, ruby, node, etc. The versions (or lifecycle) of these dependencies is less often tied to any specific application and more often tied to a set of tests that have been run on the hardware to make sure that everything operates as expected.
* ***application dependency*** - An application dependency is something that is used by the application itself.  These are things like ruby gems, node modules or java jars.  The versions (or lifecycle) of these dependencies are intimately tied together with the application code and can regularly change from one version of the application to another.

These two concepts also define the boundary between the system administrator and the application developer.  The system administrator is in charge of system level dependencies.  The developer is in charge of application dependencies.  The developer can choose to use whatever they want ***as long as*** they can package that thing into the tarball.

### Anatomy of a "Deployable" Tarball

A deployable tarball ***must*** have a single directory at its root, that directory will be used as the working directory for the application.  The basic rule is that if you run `tar xzf file.tar.gz` it should create its own directory with things in it rather than dump its contents directly into your current directory.

Other than that restriction, the tarball can contain anything.  It generally *should* contain *all* application dependencies.  If you are running a java program, it should have all of your jars.  If you are running a node program, it should have been built including the `node_modules` directory. Etc.

### Config Tarballs

A config tarball contains all of the configuration for your application.  It has no contract aside from being a gzipped tar file.  The config tarball is extracted _as is_ into the single working directory created from extracting the deployable tarball.

That is, if you want a file `config.json` to exist in the `conf` directory for your application deploy, your config tarball should just contain `conf/config.json`.

### Running

Shio runs the application by calling the `start.sh` script.  So, after extracting the deployable tarball and the config tarball, a `start.sh` script *must* exist in the working directory.

In general, it is most common (and probably advisable) to store the `start.sh` script in the deployable tarball, but depending on your application's needs it can also be a part of the configuration tarball.

`start.sh` should generally use exec to run the long-running application process.

## Interacting with Shio

These instructions assume someone else has setup shio for you and you are just using it.  Even if you are planning on setting up the software, I recommend reading this first just to get a high-level understanding of what shio provides.

We start with the two main concepts of shio: servers and slots.  Servers are the physical machines that you deploy to.  Slots are deployment slots that exist on servers for deployment.  You can have multiple different slots on the same server and deploy different things to that one server.

You can see a list of your current servers by running `bin/shio servers show`, which might look something like

``` bash
~/shio$bin/shio servers show
machine      host            osType   platform   arch   cpus   mem          
i-f5c762c1   172.31.20.133   Linux    linux      x64    1      1731977216   
i-311daf06   172.31.27.46    Linux    linux      x64    1      1731977216  
```

You can also see the set of slots available with

``` bash
~/shio$bin/shio slots show
No results match your query
```

This shows no slots because we haven't created any yet.  Let's create one.

``` bash
~/shio$bin/shio servers createSlot blah
machine      host            osType   platform   arch   cpus   mem          
i-f5c762c1   172.31.20.133   Linux    linux      x64    1      1731977216   
i-311daf06   172.31.27.46    Linux    linux      x64    1      1731977216 
```

This creates the `blah` slot on the machines and spits out the list of machines that the verb, `createSlot` applied to.

We can verify that they were created by running

``` bash
~/shio$bin/shio slots show
machine      slot   host            binary   binaryVersion   config   configVersion   state     
i-f5c762c1   blah   172.31.20.133   _empty   _empty          _empty   _empty          STOPPED   
i-311daf06   blah   172.31.27.46    _empty   _empty          _empty   _empty          STOPPED  
```

This is a great time to introduce an important concept for working with shio: filters!  The shio command line operates by applying verbs (like `show`) to a list of slots or servers.  The list that the verb gets applied to can be controlled through the use of filters.  The list of available filters is a part of the help text, so just run `bin/shio servers -h` or `bin/shio slots -h` to see the list.  I'll just discuss and use two in this doc: `-m` and `-s`, the "machine" and "slot" filters.

Let's filter down the servers listing real quick

``` bash
~/shio$bin/shio servers -m i-f5c762c1 show
machine      host            osType   platform   arch   cpus   mem          
i-f5c762c1   172.31.20.133   Linux    linux      x64    1      1731977216  
```

It only shows us that one machine now.  Now let's create a slot here too.

``` bash 
~/shio$bin/shio servers -m i-f5c762c1 createSlot anotherSlot
machine      host            osType   platform   arch   cpus   mem          
i-f5c762c1   172.31.20.133   Linux    linux      x64    1      1731977216  
```

We now have 3 total slots!

``` bash
~/shio$bin/shio slots show
machine      slot          host            binary   binaryVersion   config   configVersion   state     
i-f5c762c1   blah          172.31.20.133   _empty   _empty          _empty   _empty          STOPPED   
i-f5c762c1   anotherSlot   172.31.20.133   _empty   _empty          _empty   _empty          STOPPED   
i-311daf06   blah          172.31.27.46    _empty   _empty          _empty   _empty          STOPPED 
```

If we wanted to just operate on the blah slots, we can do

``` bash
~/shio$bin/shio slots -s blah show
machine      slot   host            binary   binaryVersion   config   configVersion   state     
i-f5c762c1   blah   172.31.20.133   _empty   _empty          _empty   _empty          STOPPED   
i-311daf06   blah   172.31.27.46    _empty   _empty          _empty   _empty          STOPPED   
```

We can delete the slots with the `deleteSlot` verb

``` bash
~/shio$bin/shio servers deleteSlot anotherSlot
machine      host            osType   platform   arch   cpus   mem          
i-f5c762c1   172.31.20.133   Linux    linux      x64    1      1731977216   
i-311daf06   172.31.27.46    Linux    linux      x64    1      1731977216   
~/shio$bin/shio slots show
machine      slot   host            binary   binaryVersion   config   configVersion   state     
i-f5c762c1   blah   172.31.20.133   _empty   _empty          _empty   _empty          STOPPED   
i-311daf06   blah   172.31.27.46    _empty   _empty          _empty   _empty          STOPPED   
```

Now, to deploy things, we're going to assume you already have tarballs created and in the right locations.  If you don't, just imagine that you did and that these things would magically work for you.  You've gotten this far, so you are probably good at the imagination thingie.

``` bash
~/shio$bin/shio slots assign my_app 0.2.4-1 demo 2013-11-10
machine      slot   host            binary   binaryVersion   config   configVersion   state     
i-311daf06   blah   172.31.27.46    my_app     0.2.4-1         demo     2013-11-10      RUNNING   
i-f5c762c1   blah   172.31.20.133   my_app     0.2.4-1         demo     2013-11-10      RUNNING
```

Here we assigned a specific binary and a specific config to all slots.  Note that there are 4 arguments being passed to the `assign` verb: `<binary> <binaryVersion> <config> <configVersion>`.  Shio downloaded the relevant tarballs and splatted them over each other as described above and ran the `start.sh` script.

Let's stop just one of them

``` bash
~/shio$bin/shio slots -m i-f5c762c1 stop
machine      slot   host            binary   binaryVersion   config   configVersion   state     
i-f5c762c1   blah   172.31.20.133   my_app     0.2.4-1         demo     2013-11-10      STOPPED   
```

And admire our work

``` bash
~/shio$bin/shio slots show
machine      slot   host            binary   binaryVersion   config   configVersion   state     
i-311daf06   blah   172.31.27.46    my_app     0.2.4-1         demo     2013-11-10      RUNNING   
i-f5c762c1   blah   172.31.20.133   my_app     0.2.4-1         demo     2013-11-10      STOPPED   
```

You can start it up again with the `start` command and unassign a slot with the `unassign` command as well.

## Setting up Shio

### Deploying Shio

Shio requires two processes to run.

1. Coordinator(s)
2. Agent(s)

### Coordinator

The coordinator maintains state about what machines exist and is the general thing that the client interacts with.  It is possible to have multiple of these operating behind a load balancer for availability if that is a concern.

The coordinator can be run from

```
npm run-script coordinator
```

### Agent

The agents exist on each individual machine and they enact the will of the coordinator.  They maintain the local state of what slots exist and what is in those slots.

The agent can be run with 

```
npm run-script agent
```

### Storing your tarballs

Tarballs are stored in S3 buckets under well-known paths.

You can configure the s3 buckets by setting the parameters XXX

Binary tarballs follow the path structure:

```
```

Config tarballs follow the path structure:

```
```

### Configuring shio

Check out `conf/default-config.json` for shio's configuration options and their defaults.  You can override any of the defaults by creating a `config.json` file in the root directory of shio and specifying new values for the fields you want to override.

Also, shio uses substack/seaport to communicate which agents are alive to the coordinators.  You can override any property in the seaport registration config by adding a field to the agent object in the config.

## TODO

1. Document tarball storage
1. Make a verb that allows you to list the binaries and versions available.  Same for configs.
2. Make a verb that pulls the config down for you to inspect locally
3. Persist state about nodes so that servers that disappear can be viewed from the servers view
4. Make a verb that allows you to push tarballs through shio instead of directly into s3



