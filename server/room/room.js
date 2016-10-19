var DEFAULT_SKIP_THRESHOLD = 1/2;

/**
 * Create a new room object.
 * @param {!string} name - The name of the room.
 * @param {?string} password - The password of the room.
 * @throws Error when arguments are not valid.
 * @param {?boolean} [visible] - Whether the room should be visible or not.
 */
var Room = function(name, password, visible) {
    
    if (typeof name !== "string") {
	// name must be defined and be a string
	throw "Name of room must be a string.";
    } // TODO: check if valid name

    if (password === "") {
	// empty string is not considered a password
	password = null;
    }

    if (password != null && typeof password !== "string") {
	// password must be either null or string
	throw "Password must be of type string or null.";
    }

    if (visible == null) {
	// visible by default
	visible = true;
    }

    if (typeof visible !== "boolean") {
	// visible must be boolean
	throw "Visibility must be a boolean or null."
    }

    // everything fine, create object
    this.name = name;
    this.password = password;
    this.visible = visible;

    this.users = [];
    this.artist = null;
    this.history = [];
    this.skip = [];
    this.skipThreshold = DEFAULT_SKIP_THRESHOLD;
}

/**
 * Clear the drawing-history of the room.
 * @param {string} nick - The user to clear. Must be artist in order to clear.
 * @return {boolean} - true if successful in clearing, otherwise false.
 */
Room.prototype.clear = function(nick) {

    if (!this.isArtist(nick)) {
	// only artists can clear
	return false;
    }

    // otherwise all good, clear history
    this.history = [];
    return true;
}

/**
 * Undo the last draw-event in the room.
 * @param {string} nick - The name of the artist.
 * @return {boolean} - true if successful, otherwise false.
 */
Room.prototype.undo = function(nick) {

    if (!this.isArtist(nick)) {
	// only artists can undo
	return false;
    }
    
    // remove the last stroke
    var strokeEnd = findStrokeEnd(this.history);
    if (strokeEnd != null)
	this.history.splice(strokeEnd);

    return true;
}

/**
 * Set the artist to next user in line.
 */
Room.prototype.nextArtist = function() {
    if (this.artist == this.users.length -1 || this.artist == null) {
	// the artist is the last in the list or has not been assigned yet
	// set it to the first one in the list
	if (this.users.length != 0 ) {
	    // make sure there are actually users in the room before setting 
	    // the new artist
	    this.artist = 0;
	}
    } else {
	// otherwise just take the next one in the list
	this.artist++;
    }
}

/**
 * Check if the user is the room's artist.
 * @param {string} nick - The nick of the user
 * @return {boolean}
 */
Room.prototype.isArtist = function(nick) {
    if (nick == null) {
	// must check if nick is null first as artist might be, if no one is
	return false;
    }

    return nick === this.users[this.artist];
}

/**
 * Get the name of the artist.
 * @return {?string} - The name of the artist or null if there is no artist.
 */
Room.prototype.getArtist = function() {
    return this.users[this.artist];
}

/**
 * Get the count of room's members.
 * @return {int}
 */
Room.prototype.memberCount = function() {
    return this.users.length;
}

/**
 * Rename user.
 * @param {string} prev - The previous name of the user.
 * @param {string} next - The next name of the user.
 * @return {boolean} - Whether or not the user was renamed.
 */
Room.prototype.renameUser = function(prev, next) {
    
    if (this.nickIsTaken(next)) {
	// the nick is already taken
	return false;
    }

    var index = this.users.indexOf(prev);

    if (index !== -1) {
	// TODO: check if next nick is valid
	room[index] = next;
	return true;
    } 

    // user does not exist
    return false;
}

/**
 * Add user to the room.
 * @param {string} nick - The name of the user.
 */
Room.prototype.addUser = function(nick) {
    this.users.push(nick);
    this.skip.push(0);
}

/**
 * Remove user from the room.
 * @param {string} nick - The name of the user.
 */
Room.prototype.removeUser = function(nick) {
    
    // get the user's index
    var index = this.users.indexOf(nick);

    if (index < this.artist) {
	// if the artist is after the user to be removed then decrement the
	// index of the artist
	room.artist--;
    }

    // remove user and its skip-value
    this.skip.splice(index, 1);
    this.users.splice(index, 1);
}

/**
 * Check if the nick is used in the room.
 * @param {string} nick - The nick to check.
 * @return {boolean}
 */
Room.prototype.nickIsTaken = function(nick) {
    return null != this.users.find(function(other) { return other==nick; });
}

/**
 * Check if the room is passworded.
 * @return {boolean}
 */
Room.prototype.isPassworded = function() {
    return this.password != null;
}

/**
 * Check if the password matches the password of the room.
 * @param {?string} password - The password to check.
 * @return {boolean}
 */
Room.prototype.passwordMatch = function(password) {
    return this.password == password;
}

/** 
 * Vote to skip the next artist.
 * @param {string} nick - The name of the user skipping.
 * @throws Error if the user cannot add skip.
 * @return {boolean} If the artist is skipped.
 */
Room.prototype.skipArtist = function(nick) {
    
    if (this.isArtist(nick)) {
	// artist can always skip
	return true;
    } else {
	// other users has to vote

	if (this.hasSkipped(nick)) {
	    throw "You already voted to skip."
	}
    
	// set skip of user
	this.skip[this.users.indexOf(nick)] = 1;

	return this.majoritySkipped();
    }
}

/**
 * Reset all skips.
 */
Room.prototype.resetSkip = function() {
    this.skip.fill(0);
}

/**
 * Check if given user has already skipped.
 * @return {boolean}
 */
Room.prototype.hasSkipped = function(nick) {
    return this.skip[this.users.indexOf(nick)] === 1;
}

/**
 * Get the sum of all the room's skips.
 * @return {int} - The sum.
 */
Room.prototype.skipCount = function() {
    return this.skip.reduce(function(x, y) { return x + y; }, 0);
}

/**
 * Check if the majority of the room's users, according to skip-threshold, 
 * wants to skip.
 * @return {boolean}
 */
Room.prototype.majoritySkipped = function() {
    return this.skipCount() / this.users.length > this.skipLimit;
}

/**
 * Find the index of last "mouseup"-event in array or the last 
 * "mousedown"-event if the previous was not found.
 * @param {Object[]} arr - Array of draw-events.
 * @return {int|null} - The index of last "mouseup", or if none found last
 *			"mousedown", if none of those were found returns null.
 */
function findStrokeEnd(arr) {
    for (var i = arr.length; --i >= 0;) {
	if (arr[i].type == "mouseup")
	    return i;
    }
    for (var i = arr.length; --i >= 0;) {
	if (arr[i].type == "mousedown")
	    return i;
    }
    return null;
};

module.exports = Room;
