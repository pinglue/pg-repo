
//import {HelpConfiguration} from "commander";

import {style} from "./style.js";

// type: Partial<Help> of commander package
export const commanderHelp = {

    sortSubcommands: true,

    sortOptions: true,

    commandUsage: cmd => style.warn(cmd.name()) + " " + style.hl(cmd.usage()),

    //commandDescription: cmd => style.bold(cmd.description()),

    optionTerm: opt => {

        const arr = [];
        opt.short && arr.push(opt.short);
        opt.long && arr.push(opt.long);
        return style.warn(arr.join(", ")) + "";

    },

    subcommandTerm: cmd=>style.warn(cmd.name()) + " " + style.hl(cmd.usage())

    /*formatHelp: (cmd,helper)=>{
        //console.log(cmd.commands.map(cmd=>cmd.name()));
        console.log(cmd.processedArgs);

        return "hahaha";
    }*/

};