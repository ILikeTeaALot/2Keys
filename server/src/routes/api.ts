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
 * @overview Main routes of 2Keys server
 */
import { Router } from "express";
import { readFile, writeFile } from "fs";
import { join } from "path";
import YAML from "yaml";
import { config_loader } from "../util/config";
import Logger from "../util/logger";
import { Config, Hotkey } from "../util/interfaces";
import { run_hotkey, fetch_hotkey } from "../util/ahk";
import { CONFIG_FILE } from "../util/constants";

const logger: Logger = new Logger({
  name: "api",
});
const router = Router();

/**
 * Returns the config for the 2Keys project
 */
router.get("/get/config", (req, res, next) => {
  logger.debug("Sending a config copy as JSON...");
  readFile(join(process.cwd(), "config.yml"), (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.send(err.stack);
    }
    const data_to_send = JSON.stringify(YAML.parse(data.toString()));
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 200;
    res.send(data_to_send);
  });
});

/**
 * Trigger a hotkey
 * Info to send:
 * - keyboard: The keyboard name that has been pressed
 * - key: set of keys that have been pressed
 */
router.post("/post/trigger", async (req, res, next) => {
  /**
   * 1: Get hotkey function from config
   * 2: Execute C++ bindings with #Include <root of keyboard>; function()
   */
  // Get vars
  const keyboard = req.body.keyboard;
  const hotkey_code = req.body.hotkey;
  logger.debug(`Got keyboard ${keyboard} and hotkey ${hotkey_code}`);
  // Parse config
  try {
    const fetched_hotkey = await fetch_hotkey(keyboard, hotkey_code); // Gets hotkey

    // Handle
    run_hotkey(fetched_hotkey.file, fetched_hotkey.func);

    res.statusCode = 200;
    res.send("OK")
  } catch (err) {
    logger.throw_noexit(err);
    res.statusCode = 500
    res.send(err.stack.toString());
  }
});

/**
 * Handles keyboard path update
 */
router.post("/post/update-keyboard-path", (req, res, next) => {
  const { keyboard, path } = req.body;
  logger.info(`Got update for ${keyboard}, path ${path}`);
  config_loader()
    .then((config) => {
        // Make changes
        config.keyboards[keyboard].path = path;
        // Write
        logger.debug("Writing config...");
        writeFile(CONFIG_FILE, YAML.stringify(config), (err) => {
          if (err) {
            res.statusCode = 500;
            res.send(err.stack.toString());
          } else {
            res.statusCode = 200;
            res.send("OK");
          }
          res.end();
        })
    })
})

export default router;
