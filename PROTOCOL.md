# PROTOCOL DEFINITION
> 
## help

> `("help", [command])`

> The client can send a help request to the server to receive information
> regarding a certain command or commands in general.

> ---

> `("help", <string>)`

> The server responds with a string with either detailed information about the
> command given or an overview over all commands.

> If the server does not understand the request (for example if the given 
> command does not exist) the string will be `null`.

> ---
## nick

> `("nick", <nick>)`

> The client registers its nick or changes its nick by sending a nick-request.

> ---

> `("nick", <nick>, [message])`

> The server responds with a nick back which contains the nick that the client
> has been granted. If the nick was already taken the old nick is sent back.
> If the client did not already register a nick and it was occupied `null` is 
> returned.

> In case the nick the client requested is not set the server sends along a 
> message explaining why.

> ---
## create

> `("create", <room>, [password], [private])`

> The client registers a new room by sending a create-request.

> `<room>` **(string)** is the name of the room to be created.

> `[password]` **(string)** decides the password of the channel if given. If no
> password is given then no password is set.

> `[private]` **(boolean)** determines wheter the room is visible in the 
> room-list or if you have to join the room by specifically searching for it.

> ---

> `("create", <room>, [message])`

> The server responds with the name of the room if a room was successfully 
> creted. If it could not be created the variable room is instead `null` 
> and a message explaining why is passed along.

> ---
## join
> ---
## list
> ---
## active
> ---
## draw
> ---
## message
> ---
## undo
> ---
