// Messaging/RabbitMq/RabbitMqTaskEventPublisher.cs
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using api.Messaging.Abstractions;
using api.Models;

namespace api.Messaging.RabbitMq;

public sealed class RabbitMqTaskEventPublisher : ITaskEventPublisher, IAsyncDisposable
{
    private readonly RabbitMqOptions _options;
    private readonly IConnection _conn;
    private readonly IChannel _channel;

    public RabbitMqTaskEventPublisher(IOptions<RabbitMqOptions> options)
    {
        _options = options.Value;

        var factory = new ConnectionFactory
        {
            HostName = _options.HostName,
            Port = _options.Port,
            VirtualHost = _options.VirtualHost,
            UserName = _options.UserName,
            Password = _options.Password,
            AutomaticRecoveryEnabled = true,
            TopologyRecoveryEnabled  = true
        };

        _conn    = factory.CreateConnectionAsync().GetAwaiter().GetResult();
        _channel = _conn.CreateChannelAsync().GetAwaiter().GetResult();

        // durable topic exchange (idempotent)
        _channel.ExchangeDeclareAsync(
            exchange:   _options.Exchange,
            type:       ExchangeType.Topic,
            durable:    true,
            autoDelete: false,
            arguments:  null,
            noWait:     false,
            cancellationToken: CancellationToken.None
        ).GetAwaiter().GetResult();
    }

    public async Task PublishAsync(TaskJobType jobType, string payloadJson, CancellationToken ct = default)
    {
        if (ct.IsCancellationRequested) return;

        // Body is EXACTLY the worker schema JSON
        var body = Encoding.UTF8.GetBytes(payloadJson);

        var props = new BasicProperties
        {
            ContentType  = "application/json",
            DeliveryMode = DeliveryModes.Persistent,
            MessageId    = Guid.NewGuid().ToString(),
            // 'Type' header is fine; worker validates body only
            Type         = RoutingKeyFor(jobType),
            Timestamp    = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds())
        };

        await _channel.BasicPublishAsync(
            exchange:       _options.Exchange,
            routingKey:     RoutingKeyFor(jobType),
            mandatory:      false,
            basicProperties: props,
            body:           body,
            cancellationToken: ct
        );
    }

    private static string RoutingKeyFor(TaskJobType t) => t switch
    {
        TaskJobType.Insights   => "task.insights",
        TaskJobType.FullReport => "task.full_report",
        TaskJobType.Memo       => "task.memo",
        TaskJobType.Slides     => "task.slides",
        TaskJobType.SurveyData => "task.survey_data",
        TaskJobType.FactCheck  => "task.fact_check",
        _ => "task.unknown"
    };

    public async ValueTask DisposeAsync()
    {
        try { await _channel.CloseAsync(); await _channel.DisposeAsync(); } catch { }
        try { await _conn.CloseAsync();    await _conn.DisposeAsync();    } catch { }
    }
}
