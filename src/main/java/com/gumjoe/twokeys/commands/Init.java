package com.gumjoe.twokeys.commands;

import java.io.*;
import java.nio.file.*;
import java.net.URL;
import java.net.MalformedURLException;
import java.util.Properties;

import com.gumjoe.twokeys.types.LocalConfig;
import org.apache.commons.io.FileUtils;
import com.esotericsoftware.yamlbeans.*;
import com.gumjoe.twokeys.generators.*;
import com.gumjoe.twokeys.util.*;

public class Init {

    // Setting methods
    public Path dir = Paths.get("./");
    public Path installPath = OOBE.defaultInstallPath;
    private boolean force = false;

    /**
     * Set the directory to init it
     * @param dir Directory to copy files to
     */
    public void setDir(String dir) {
        this.dir = Paths.get(dir);
    }

    /**
     * Set the directory to download programs to
     * @param installLoc Directory to download programs to
     */
    public void setInstallDir(String installLoc) {
        this.installPath = Paths.get(installLoc);
    }

    /**
     * Force all parts of init to run
     */
    public void force() {
        this.force = !this.force;
    }

    /**
     * Generate local config
     */
    public LocalConfig createLocalConfig() {
        Logger.debug("Generating local, default config...");
        LocalConfig config = GenerateLocalConfig.genDefaultConfig();
        // Assign dir if specified
        config.keyboard.dir = this.dir.toString();
        return config;
    }

    /**
     * Initialises boilerplate code
     */
    public void run() {
        // Run OOBE if needed
        Config config = new Config(Config.defaultConfigPath.toString());
        if (config.config.getProperty("general.oobe") == "true" || this.force) {
            Logger.debug("Running OOBE...");
            OOBE oobe = new OOBE(this.installPath);
            if (this.force) {
                oobe.force();
            }
            oobe.run();
        }

        // Once OOBE done, detect keyboard
        try {
            Logger.info("Creating a config...");
            Logger.info("Assuming one keyboard...");
            LocalConfig localConfig = this.createLocalConfig();
            Logger.info("Config written.");
            YamlWriter writer = new YamlWriter(new FileWriter(Paths.get(this.dir.toString(), "config.yml").toString()));
            writer.write(localConfig);
            writer.close();
        } catch (IOException e) {
            e.printStackTrace();
        }

        // Get keyboard
        Logger.info("Now detecting keyboard...");
        Logger.info("Running Keyboard.exe...");
        Logger.info("A window will open asking you to press a key.");
        Logger.info("Press a key on the keyboard (preferably one of the letter keys) so that a string appears in the box");
        Logger.info("This is your keyboard's Hardware ID (HID) which will be used to detect if the second keyboard is in use");
        Logger.info("Once you're done, click \"Confirm\" to add to HID to the config to track your keyboard");
        // Run command "~/.2Keys/apps/2Keys/2KeysInput.exe detect --config <dir>/config.yml
    }
}