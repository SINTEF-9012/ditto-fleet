import {program} from "commander";

//const program = new Command();

    
program
    .name('cmd')
    .command('model', 'parsing and handling the user-provided models')
    .command('device', 'work with devices')
    .command('dt', 'digital twins')
    .command('mqtt', 'sample mqtt client currently using for testing')
    
program.parse(process.argv)
