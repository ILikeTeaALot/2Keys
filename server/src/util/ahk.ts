/**
Copyright 2018 Kishan Sambhi

This file is part of 2Keys.

2Keys is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

2Keys is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with 2Keys.  If not, see <https://www.gnu.org/licenses/>.
*/
/**
 * @overview Handler for autohotkey running
 */
import * as fs from "fs";
import { promisify } from "util";
import { Hotkey, Config, FetchHotkey } from "./interfaces";
import { config_loader, userspace_config_loader } from "./config";
import { AHK_LIB_PATH } from "./constants";
import Logger from "./logger";
import { join } from "path";

const ahk = require("../../build/Release/twokeys");
const logger: Logger = new Logger({ name: "ahk" });
const access = promisify(fs.access);

export async function fetch_hotkey(keyboard: string, hotkey_code: string): Promise<FetchHotkey> {
  const config: Config = await config_loader();

  // Get hotkey func
  let func;
  if (!config.keyboards.hasOwnProperty(keyboard)) { // Validate
    throw new ReferenceError(`Keyboard ${keyboard} was not found!`);
  } else if (!config.keyboards[keyboard].hotkeys.hasOwnProperty(hotkey_code)) {
    throw new ReferenceError(`Hotkey ${hotkey_code} was not found in keyboard ${keyboard}!`);
  }
  const hotkey: string | Hotkey = config.keyboards[keyboard].hotkeys[hotkey_code];
  if (typeof hotkey !== "string") {
    // Object type
    func = hotkey.func;
  } else {
    func = hotkey;
  }

  // Get file
  const file = join(process.cwd(), config.keyboards[keyboard].dir, config.keyboards[keyboard].root);

  return {
    file,
    func
  }
}

/**
 * Run a hotkey by sending execution string to C++ addon
 * @param file {String} File to get hotkeys from
 * @param func {String} Function to run from that file
 */
export async function run_hotkey(file: string, func: string): Promise<void> {
  const old_cwd: string = process.cwd()
  // 1: Santise file input to prevent code injection
  // Check it exists
  try {
    await access(file, fs.constants.F_OK | fs.constants.S_IFREG);
  } catch (err) {
    logger.throw_noexit(err);
  } finally {
    // 2: Verify func ok
    // Check if matches FuncName() format
    const regexp: RegExp = /^[a-z0-9]+$/i; // From https://stackoverflow.com/questions/388996/regex-for-javascript-to-allow-only-alphanumeric
    if (regexp.test(func)) {
      // Yay! run the hotkey
      logger.debug(`#Include ${file}; ${func}()`);
      try { 
        const userspace_config = await userspace_config_loader();
        const ahk_run = ahk.run_ahk_text(join(userspace_config.paths.software, userspace_config.software.ahk.paths.root, userspace_config.software.ahk.paths.dll), `#Include ${file}\n${func}()`);
        if (typeof ahk_run !== "undefined") {
          // ERROR!
          const error: Error = new Error(`Error running AutoHotkey: ${ahk_run.message}.  Code: ${ahk_run.code}`)
          logger.throw_noexit(error);
        }
        // Change back to old CWD
        process.chdir(old_cwd);
      } catch (err) {
        logger.throw_noexit(err);
      }
    } else {
      logger.err(`Function ${func} is invalid for regexp "${regexp}"`);
    }
  }
}