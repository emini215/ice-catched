var Room = function(name, password, visible) {
    this.name = name;
    this.password = password;
    this.visible = visible;

    this.users = [];
    this.artist = null;
    this.history = [];
    this.skip = [];
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

    if (!isArtist(nick)) {
	// only artists can undo
	return false;
    }
    
    // remove the last stroke
    var strokeEnd = findStrokeEnd(this.history);
    if (strokeEnd != null)
	this.history.splice(strokeEnd);

    return true;
}

Room.prototype.nextArtist = function() {
    if (this.artist == this.users.length -1 || this.artist == null) {
	// the artist is the last in the list or has not been assigned yet
	// set it to the first one in the list
	this.artist = 0;
    } else {
	// otherwise just take the next one in the list
	this.artist++;
    }
}

Room.prototype.isArtist = function(nick) {
    if (nick == null) {
	// must check if nick is null first as artist might be, if no one is
	return false;
    }

    return nick === this.users[this.artist];
}

Room.prototype.getArtist = function() {
    return this.users[this.artist];
}

Room.message(message) // io


Room.renameUser(prev, next)

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
 * Check if the password matches the password of the room.
 * @param {?string} password - The password to check.
 * @return {boolean}
 */
Room.prototype.passwordMatch = function(password) {
    return this.password == password;
}


module.exports = Room;