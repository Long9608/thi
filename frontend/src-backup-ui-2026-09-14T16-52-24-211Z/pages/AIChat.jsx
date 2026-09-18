import React, {
  useEffect,
  useRef,
  useState
} from 'react';

import {
  Bot,
  Send,
  User,
  Loader2,
  Sparkles,
  RefreshCw
} from 'lucide-react';

import { aiAPI } from '../api';


const SUGGESTIONS = [
  'Tháng này có bao nhiêu hóa đơn?',
  'Hiện có bao nhiêu cư dân?',
  'Tìm xe của Bảo',
  'Tổng giá trị hóa đơn tháng này bao nhiêu?',
  'Phân tích xu hướng hóa đơn'
];


export default function AIChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content:
        'Xin chào! Tôi là trợ lý AI của Đức Vũ Tower.\n\n' +
        'Bạn có thể hỏi tôi về cư dân, căn hộ, phương tiện, ' +
        'hợp đồng, hóa đơn và thống kê trong hệ thống.'
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);


  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, loading]);


  const sendMessage = async (
    customMessage = null
  ) => {
    const content = String(
      customMessage ?? input
    ).trim();

    if (!content || loading) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content
    };

    setMessages((prev) => [
      ...prev,
      userMessage
    ]);

    setInput('');
    setLoading(true);

    try {
      const response = await aiAPI.chat(
        content
      );

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content:
          response?.answer ||
          'Tôi chưa có câu trả lời phù hợp.',
        type: response?.type || null,
        data: response?.data || null
      };

      setMessages((prev) => [
        ...prev,
        aiMessage
      ]);

    } catch (error) {
      console.error(
        'AIChat sendMessage error:',
        error
      );

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: 'assistant',
          content:
            'Không thể kết nối tới AI Service. ' +
            'Vui lòng kiểm tra FastAPI đang chạy ở cổng 8000.'
        }
      ]);

    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = (event) => {
    event.preventDefault();

    sendMessage();
  };


  const handleKeyDown = (event) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  };


  const resetChat = () => {
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content:
          'Đã bắt đầu cuộc trò chuyện mới.\n\n' +
          'Bạn muốn tra cứu hoặc phân tích thông tin gì?'
      }
    ]);

    setInput('');
  };


  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[650px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef5f2] text-[#1f4f46]">
            <Bot size={23} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-950">
                Chat AI
              </h3>

              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Đang hoạt động
              </span>
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              Trợ lý dữ liệu Đức Vũ Tower
            </p>
          </div>

        </div>


        <button
          type="button"
          onClick={resetChat}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Đoạn chat mới
        </button>

      </div>


      {/* Chat area */}
      <div className="flex-1 overflow-y-auto bg-slate-50/60 px-4 py-5 md:px-6">

        <div className="mx-auto max-w-4xl space-y-5">

          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
            />
          ))}


          {loading && (
            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1f4f46] text-white">
                <Bot size={18} />
              </div>


              <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">

                <div className="flex items-center gap-2 text-sm text-slate-600">

                  <Loader2
                    size={16}
                    className="animate-spin"
                  />

                  AI đang phân tích dữ liệu...

                </div>

              </div>

            </div>
          )}


          <div ref={bottomRef} />

        </div>

      </div>


      {/* Suggestions */}
      <div className="border-t border-slate-100 bg-white px-4 pt-3 md:px-6">

        <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto pb-2">

          {SUGGESTIONS.map(
            (suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={loading}
                onClick={() =>
                  sendMessage(suggestion)
                }
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-[#1f4f46]/40 hover:bg-[#eef5f2] hover:text-[#1f4f46] disabled:opacity-50"
              >
                {suggestion}
              </button>
            )
          )}

        </div>

      </div>


      {/* Input */}
      <div className="bg-white px-4 pb-4 pt-2 md:px-6 md:pb-5">

        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-4xl"
        >

          <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-[#1f4f46]/50">

            <textarea
              rows={1}
              value={input}
              disabled={loading}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Hỏi AI về dữ liệu chung cư..."
              className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
            />


            <button
              type="submit"
              disabled={
                loading ||
                !input.trim()
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1f4f46] text-white transition hover:bg-[#173f38] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Send size={18} />
              )}
            </button>

          </div>


          <p className="mt-2 text-center text-[11px] text-slate-400">
            Enter để gửi · Shift + Enter để xuống dòng
          </p>

        </form>

      </div>

    </div>
  );
}


function ChatMessage({
  message
}) {
  const isUser =
    message.role === 'user';

  return (
    <div
      className={`flex items-start gap-3 ${
        isUser
          ? 'justify-end'
          : 'justify-start'
      }`}
    >

      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1f4f46] text-white">
          <Bot size={18} />
        </div>
      )}


      <div
        className={`max-w-[85%] md:max-w-[75%] ${
          isUser
            ? 'order-1'
            : ''
        }`}
      >

        <div
          className={
            isUser
              ? 'whitespace-pre-wrap rounded-2xl rounded-tr-md bg-[#1f4f46] px-4 py-3 text-sm leading-6 text-white'
              : 'whitespace-pre-wrap rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm'
          }
        >
          {message.content}
        </div>


        {!isUser &&
          message.type && (
            <div className="mt-1.5 flex items-center gap-1.5 px-1 text-[11px] text-slate-400">

              <Sparkles size={12} />

              {getTypeLabel(
                message.type
              )}

            </div>
          )}

      </div>


      {isUser && (
        <div className="order-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
          <User size={18} />
        </div>
      )}

    </div>
  );
}


function getTypeLabel(type) {
  switch (type) {
    case 'SEARCH':
      return 'Tra cứu dữ liệu';

    case 'STATISTICS':
      return 'Thống kê hệ thống';

    case 'INSIGHT':
      return 'Phân tích AI';

    case 'GREETING':
      return 'Trợ lý AI';

    case 'HELP':
      return 'Hướng dẫn';

    default:
      return 'AI Assistant';
  }
}