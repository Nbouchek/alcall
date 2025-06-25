function get_name()
    return "Health Checker"
end

function get_description()
    return "Simple Health Check Endpoint"
end

function get_version()
    return 1
end

function get_package()
    return "janus.plugin.health"
end

function get_api_compatibility()
    return 8
end

function handle_message(message)
    -- This plugin does not handle Janus API messages
    return { janus = "error", error = { code = 404, reason = "Not Found" } }
end

function incoming_request(request)
    if request.path == "/health" then
        if request.method == "HEAD" or request.method == "GET" then
            return {
                status = 200,
                headers = { ["Content-Type"]="text/plain" },
                body = "OK"
            }
        else
            return {
                status = 405,
                headers = { ["Content-Type"]="text/plain" },
                body = "Method Not Allowed"
            }
        end
    end
    -- Not our request, let Janus handle it
    return nil
end
