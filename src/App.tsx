import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  HeartPulse,
  LoaderCircle,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Wallet
} from "lucide-react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  isAddress,
  type Address,
  type EIP1193Provider,
  type Hash,
  type PublicClient,
  type WalletClient
} from "viem";
import { CATEGORIES, chainRescueAbi, monadTestnet, STATUSES, STATUS_LABELS, type Category, type TaskStatus } from "./lib/contract";
import { DEMO_TASKS, type RescueTask } from "./lib/demo-data";

type Notice = {
  kind: "pending" | "success" | "error";
  title: string;
  message: string;
  hash?: Hash;
};

type TxHistoryItem = {
  action: string;
  hash: Hash;
  taskId?: number;
  createdAt: Date;
};

type TaskAction = "Görevi üstlen" | "Tamamlandı bildir" | "Doğrulamayı kaydet";

type OnChainTask = {
  id: bigint;
  category: number;
  description: string;
  fictionalArea: string;
  creator: Address;
  createdAt: bigint;
  status: number;
  assignedVolunteer: Address;
  verifierOne: Address;
  verifierTwo: Address;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
const configuredValue = import.meta.env.VITE_CHAIN_RESCUE_ADDRESS;
const contractAddress = configuredValue && isAddress(configuredValue) ? configuredValue : undefined;
const rpcUrl = import.meta.env.VITE_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";

function shortAddress(address?: Address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "—";
}

function displayDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function explorerUrl(hash: Hash) {
  return `${monadTestnet.blockExplorers.default.url}/tx/${hash}`;
}

function pause(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function statusStyle(status: TaskStatus) {
  const styles: Record<TaskStatus, string> = {
    OPEN: "border-orange-400/40 bg-orange-400/10 text-orange-300",
    CLAIMED: "border-blue-400/40 bg-blue-400/10 text-blue-300",
    REPORTED: "border-violet-400/40 bg-violet-400/10 text-violet-300",
    VERIFIED: "border-teal-400/40 bg-teal-400/10 text-teal-300"
  };
  return styles[status];
}

function toRescueTask(raw: OnChainTask): RescueTask {
  const category = CATEGORIES[raw.category] ?? "Diğer";
  const status = STATUSES[raw.status] ?? "OPEN";
  return {
    id: Number(raw.id),
    category,
    description: raw.description,
    fictionalArea: raw.fictionalArea,
    creator: raw.creator,
    createdAt: new Date(Number(raw.createdAt) * 1000),
    status,
    assignedVolunteer: raw.assignedVolunteer === ZERO_ADDRESS ? undefined : raw.assignedVolunteer,
    verifierOne: raw.verifierOne === ZERO_ADDRESS ? undefined : raw.verifierOne,
    verifierTwo: raw.verifierTwo === ZERO_ADDRESS ? undefined : raw.verifierTwo,
    source: "onchain"
  };
}

function StatusPill({ status }: { status: TaskStatus }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide ${statusStyle(status)}`}>{STATUS_LABELS[status]}</span>;
}

function TaskCard({ task, selected, onSelect }: { task: RescueTask; selected: boolean; onSelect: (task: RescueTask) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(task)}
      className={`w-full rounded-xl border p-4 text-left transition ${selected ? "border-signal bg-slate-800" : "border-slate-700 bg-slate-950/35 hover:border-slate-500 hover:bg-slate-800/80"}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="text-xs font-semibold text-signal">#{task.id} · {task.category}</span>
        <StatusPill status={task.status} />
      </div>
      <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-100">{task.description}</p>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><MapPin size={13} /> {task.fictionalArea}</div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <span>{displayDate(task.createdAt)}</span>
        <span>{task.source === "onchain" ? "Zincir üstü" : "Demo örneği"}</span>
      </div>
    </button>
  );
}

function TaskColumn({ title, icon, tasks, selectedId, onSelect, empty }: { title: string; icon: ReactNode; tasks: RescueTask[]; selectedId?: number; onSelect: (task: RescueTask) => void; empty: string }) {
  return (
    <section className="panel min-h-[260px] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-100">{icon}{title}</div>
        <span className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-slate-400">{tasks.length}</span>
      </div>
      <div className="space-y-3">
        {tasks.length > 0 ? tasks.map((task) => <TaskCard key={task.id} task={task} selected={selectedId === task.id} onSelect={onSelect} />) : <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">{empty}</p>}
      </div>
    </section>
  );
}

export default function App() {
  const publicClient = useMemo(() => createPublicClient({ chain: monadTestnet, transport: http(rpcUrl) }), []);
  const [account, setAccount] = useState<Address>();
  const [chainId, setChainId] = useState<number>();
  const [tasks, setTasks] = useState<RescueTask[]>(contractAddress ? [] : DEMO_TASKS);
  const [selectedTask, setSelectedTask] = useState<RescueTask | undefined>(contractAddress ? undefined : DEMO_TASKS[0]);
  const [categoryFilter, setCategoryFilter] = useState<"All" | Category>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | TaskStatus>("All");
  const [notice, setNotice] = useState<Notice>();
  const [history, setHistory] = useState<TxHistoryItem[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [readError, setReadError] = useState<string>();
  const [formCategory, setFormCategory] = useState<Category>("Malzeme");
  const [description, setDescription] = useState("");
  const [fictionalArea, setFictionalArea] = useState("");
  const refreshInFlight = useRef(false);
  const refreshQueued = useRef(false);

  const refreshTasks = useCallback(async () => {
    if (!contractAddress) {
      setTasks(DEMO_TASKS);
      return;
    }
    if (refreshInFlight.current) {
      refreshQueued.current = true;
      return;
    }
    refreshInFlight.current = true;
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const count = await publicClient.readContract({ address: contractAddress, abi: chainRescueAbi, functionName: "getTaskCount" });
          const loaded: OnChainTask[] = [];
          for (let index = 1; index <= Number(count); index += 1) {
            // Shared public RPC endpoints throttle bursts; keep reads under their limit.
            if (index > 1 && (index - 1) % 10 === 0) await pause(750);
            const task = await publicClient.readContract({ address: contractAddress, abi: chainRescueAbi, functionName: "getTask", args: [BigInt(index)] });
            loaded.push(task as unknown as OnChainTask);
          }
          const normalized = loaded.map(toRescueTask).sort((a, b) => b.id - a.id);
          setTasks(normalized);
          setSelectedTask((current) => normalized.find((task) => task.id === current?.id) ?? normalized[0]);
          setReadError(undefined);
          break;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Yapılandırılan kontrat okunamadı.";
          const rateLimited = message.includes("requests limited") || message.includes("429") || message.includes("rate limit");
          if (attempt === 0 && rateLimited) {
            await pause(1_200);
            continue;
          }
          setReadError(message);
        }
      }
    }
    finally {
      refreshInFlight.current = false;
      if (refreshQueued.current) {
        refreshQueued.current = false;
        void refreshTasks();
      }
    }
  }, [publicClient]);

  useEffect(() => {
    void refreshTasks();
  }, [refreshTasks]);

  useEffect(() => {
    if (!window.ethereum) return;
    const ethereum = window.ethereum;
    const syncAccount = (accounts: unknown) => {
      const next = Array.isArray(accounts) && typeof accounts[0] === "string" && isAddress(accounts[0]) ? accounts[0] : undefined;
      setAccount(next);
    };
    const syncChain = (id: unknown) => {
      if (typeof id === "string") setChainId(Number.parseInt(id, 16));
    };
    void ethereum.request({ method: "eth_accounts" }).then(syncAccount).catch(() => undefined);
    void ethereum.request({ method: "eth_chainId" }).then(syncChain).catch(() => undefined);
    ethereum.on?.("accountsChanged", syncAccount);
    ethereum.on?.("chainChanged", syncChain);
    return () => {
      ethereum.removeListener?.("accountsChanged", syncAccount);
      ethereum.removeListener?.("chainChanged", syncChain);
    };
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setNotice({ kind: "error", title: "Cüzdan gerekli", message: "İşlem göndermek için MetaMask gibi EIP-1193 uyumlu bir cüzdan kurun veya etkinleştirin." });
      return;
    }
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const selected = Array.isArray(accounts) && typeof accounts[0] === "string" && isAddress(accounts[0]) ? accounts[0] : undefined;
      if (!selected) throw new Error("Cüzdan bir hesap döndürmedi.");
      const network = await window.ethereum.request({ method: "eth_chainId" });
      setAccount(selected);
      if (typeof network === "string") setChainId(Number.parseInt(network, 16));
      setNotice({ kind: "success", title: "Cüzdan bağlandı", message: `${shortAddress(selected)} bağlandı. İşlem göndermeden önce Monad Testnet'i seçin.` });
    } catch (error) {
      setNotice({ kind: "error", title: "Bağlantı iptal edildi", message: error instanceof Error ? error.message : "Cüzdan bağlantısı tamamlanmadı." });
    } finally {
      setConnecting(false);
    }
  };

  const selectWalletAccount = async () => {
    if (!window.ethereum) {
      await connectWallet();
      return;
    }
    setConnecting(true);
    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }]
      });
      await connectWallet();
    } catch (error) {
      setNotice({
        kind: "error",
        title: "Hesap değişimi iptal edildi",
        message: error instanceof Error ? error.message : "MetaMask'ten farklı bir hesap seçilmedi."
      });
    } finally {
      setConnecting(false);
    }
  };

  const switchToMonad = async () => {
    if (!window.ethereum) return connectWallet();
    const chainHex = `0x${monadTestnet.id.toString(16)}`;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
      setChainId(monadTestnet.id);
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: number }).code : undefined;
      if (code !== 4902) {
        setNotice({ kind: "error", title: "Ağ değişimi reddedildi", message: error instanceof Error ? error.message : "Cüzdanınızdan Monad Testnet'i seçin." });
        return;
      }
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: chainHex,
            chainName: monadTestnet.name,
            nativeCurrency: monadTestnet.nativeCurrency,
            rpcUrls: [rpcUrl],
            blockExplorerUrls: [monadTestnet.blockExplorers.default.url]
          }]
        });
        setChainId(monadTestnet.id);
      } catch (addError) {
        setNotice({ kind: "error", title: "Monad Testnet eklenemedi", message: addError instanceof Error ? addError.message : "Cüzdanınıza Chain ID 10143'ü manuel ekleyin." });
      }
    }
  };

  const submit = async (
    action: string,
    taskId: number | undefined,
    send: (client: PublicClient, wallet: WalletClient) => Promise<Hash>
  ) => {
    if (!contractAddress) {
      setNotice({ kind: "error", title: "Görüntüleme modu", message: "Gerçek zincir üstü işlemler için deploy sonrası VITE_CHAIN_RESCUE_ADDRESS ayarlayın." });
      return;
    }
    if (!account || !window.ethereum) {
      setNotice({ kind: "error", title: "Cüzdan bağlayın", message: "İşlem göndermek için bir cüzdan gereklidir." });
      return;
    }
    if (chainId !== monadTestnet.id) {
      setNotice({ kind: "error", title: "Yanlış ağ", message: "Cüzdanınızı Monad Testnet'e geçirin (Chain ID 10143)." });
      return;
    }
    try {
      setNotice({ kind: "pending", title: `${action}: imza bekleniyor`, message: "İşlemi cüzdanınızda onaylayın. Henüz zincir üstünde onaylanmadı." });
      const wallet = createWalletClient({ account, chain: monadTestnet, transport: custom(window.ethereum as EIP1193Provider) });
      const hash = await send(publicClient, wallet);
      setNotice({ kind: "pending", title: `${action}: beklemede`, message: "İşlem yayınlandı. Monad Testnet onayı bekleniyor…", hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("İşlem madencilikten geçti ancak geri alındı.");
      setHistory((items) => [{ action, taskId, hash, createdAt: new Date() }, ...items]);
      setNotice({ kind: "success", title: `${action}: onaylandı`, message: "İşlem zincir üstünde onaylandı.", hash });
      await refreshTasks();
    } catch (error) {
      const message = error instanceof Error && "shortMessage" in error && typeof error.shortMessage === "string"
        ? error.shortMessage
        : error instanceof Error
          ? error.message
          : "İşlem tamamlanamadı.";
      setNotice({ kind: "error", title: `${action}: başarısız`, message });
    }
  };

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!description.trim() || !fictionalArea.trim()) {
      setNotice({ kind: "error", title: "Eksik bilgi", message: "Kısa bir açıklama ve kurgusal bir alan ekleyin." });
      return;
    }
    const categoryIndex = CATEGORIES.indexOf(formCategory);
    await submit("Talep oluştur", undefined, async (client, wallet) => {
      const { request } = await client.simulateContract({
        account,
        address: contractAddress!,
        abi: chainRescueAbi,
        functionName: "createTask",
        args: [categoryIndex, description.trim(), fictionalArea.trim()]
      });
      return wallet.writeContract(request);
    });
    setDescription("");
    setFictionalArea("");
  };

  const actOnTask = async (task: RescueTask, action: TaskAction) => {
    const functionName = action === "Görevi üstlen" ? "claimTask" : action === "Tamamlandı bildir" ? "reportCompletion" : "verifyTask";
    await submit(action, task.id, async (client, wallet) => {
      const { request } = await client.simulateContract({ account, address: contractAddress!, abi: chainRescueAbi, functionName, args: [BigInt(task.id)] });
      return wallet.writeContract(request);
    });
  };

  const visibleTasks = tasks.filter((task) => (categoryFilter === "All" || task.category === categoryFilter) && (statusFilter === "All" || task.status === statusFilter));
  const taskGroups: Record<TaskStatus, RescueTask[]> = {
    OPEN: visibleTasks.filter((task) => task.status === "OPEN"),
    CLAIMED: visibleTasks.filter((task) => task.status === "CLAIMED"),
    REPORTED: visibleTasks.filter((task) => task.status === "REPORTED"),
    VERIFIED: visibleTasks.filter((task) => task.status === "VERIFIED")
  };
  const isMonad = chainId === monadTestnet.id;
  const selectedHistory = selectedTask ? history.filter((item) => item.taskId === selectedTask.id) : [];

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#122b45_0%,_#07111f_48%)]">
      <header className="border-b border-slate-800 bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-signal text-slate-950 shadow-lg shadow-orange-950/30"><HeartPulse size={25} strokeWidth={2.6} /></div>
            <div><h1 className="text-lg font-black tracking-tight text-white">ChainRescue</h1><p className="text-xs text-slate-400">Kurgusal acil durum tatbikatları için denetlenebilir koordinasyon</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`hidden items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold sm:flex ${isMonad ? "border-teal-400/35 bg-teal-400/10 text-teal-300" : "border-amber-400/35 bg-amber-400/10 text-amber-300"}`}><Radio size={13} />{isMonad ? "Monad Testnet" : "Ağ hazır değil"}</span>
            {account && <button className="button-secondary" onClick={selectWalletAccount} disabled={connecting}><RefreshCw size={16} />Hesap değiştir</button>}
            {account && !isMonad && <button className="button-secondary" onClick={switchToMonad}>Ağı değiştir</button>}
            <button className={account ? "button-secondary" : "button-primary"} onClick={connectWallet} disabled={connecting}>{connecting ? <LoaderCircle className="animate-spin" size={16} /> : <Wallet size={16} />}{account ? shortAddress(account) : "Cüzdan bağla"}</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100"><AlertTriangle className="mt-0.5 shrink-0 text-signal" size={19} /><p><strong>Yalnızca hackathon demosu.</strong> Bu arayüzdeki tüm talep ve konumlar kurgusaldır. ChainRescue gerçek bir acil çağrı, yönlendirme veya müdahale sistemi değildir.</p></div>

        {!contractAddress && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-400/30 bg-blue-400/10 p-4 text-sm text-blue-100"><Activity className="mt-0.5 shrink-0 text-blue-300" size={19} /><p><strong>Demo örnek görüntüleyicisi:</strong> aşağıdaki kartlar yalnızca örnektir. Blockchain kaydı değildir ve işlemleri bilinçli olarak devre dışıdır. Canlı işlemler için kontratı deploy edin ve <code className="rounded bg-slate-950/50 px-1">VITE_CHAIN_RESCUE_ADDRESS</code> ayarlayın.</p></div>}
        {readError && <div className="mb-6 flex gap-3 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100"><AlertTriangle className="shrink-0" size={19} /><p><strong>Kontrat okunamadı:</strong> {readError}</p></div>}

        {notice && <div className={`mb-6 flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm ${notice.kind === "error" ? "border-red-400/30 bg-red-400/10 text-red-100" : notice.kind === "success" ? "border-teal-400/30 bg-teal-400/10 text-teal-100" : "border-orange-400/30 bg-orange-400/10 text-orange-100"}`}>
          <div className="flex gap-3">{notice.kind === "pending" ? <LoaderCircle className="mt-0.5 animate-spin" size={19} /> : notice.kind === "success" ? <CheckCircle2 className="mt-0.5" size={19} /> : <AlertTriangle className="mt-0.5" size={19} />}<p><strong>{notice.title}.</strong> {notice.message}</p></div>
          {notice.hash && <a className="shrink-0 rounded-lg p-1 hover:bg-white/10" href={explorerUrl(notice.hash)} target="_blank" rel="noreferrer" title="Monad Explorer'da aç"><ExternalLink size={17} /></a>}
        </div>}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Açık görevler", taskGroups.OPEN.length, <Clock3 size={19} />, "text-orange-300"],
            ["Devam eden", taskGroups.CLAIMED.length, <UserCheck size={19} />, "text-blue-300"],
            ["Doğrulama bekleyen", taskGroups.REPORTED.length, <ClipboardCheck size={19} />, "text-violet-300"],
            ["Doğrulanan", taskGroups.VERIFIED.length, <BadgeCheck size={19} />, "text-teal-300"]
          ].map(([label, value, icon, color]) => <div key={String(label)} className="panel flex items-center gap-4 p-4"><div className={`rounded-xl bg-slate-800 p-3 ${String(color)}`}>{icon}</div><div><p className="text-2xl font-black text-white">{value}</p><p className="text-xs font-medium text-slate-400">{label}</p></div></div>)}
        </div>

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)_350px]">
          <aside className="space-y-5">
            <section className="panel p-5">
              <div className="mb-4 flex items-center gap-2"><Plus size={18} className="text-signal" /><h2 className="font-bold text-white">Yardım talebi oluştur</h2></div>
              <form className="space-y-4" onSubmit={createTask}>
                <label className="block text-xs font-semibold text-slate-300">Kategori<select className="field" value={formCategory} onChange={(event) => setFormCategory(event.target.value as Category)}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label className="block text-xs font-semibold text-slate-300">Kısa açıklama<textarea className="field min-h-24 resize-y" maxLength={180} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="ör. Kurgusal destek noktasına malzeme ulaştırın" /></label>
                <label className="block text-xs font-semibold text-slate-300">Kurgusal alan<input className="field" maxLength={80} value={fictionalArea} onChange={(event) => setFictionalArea(event.target.value)} placeholder="ör. Demo Bölgesi A" /></label>
                <button className="button-primary w-full" type="submit"><Plus size={16} />Zincir üstü talep oluştur</button>
              </form>
            </section>
            <section className="panel p-5">
              <p className="section-label">Filtreler</p>
              <label className="mt-4 block text-xs font-semibold text-slate-300">Kategori<select className="field" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as "All" | Category)}><option value="All">Tümü</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="mt-4 block text-xs font-semibold text-slate-300">Durum<select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All" | TaskStatus)}><option value="All">Tümü</option>{STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
              <button type="button" onClick={() => void refreshTasks()} className="button-secondary mt-4 w-full"><RefreshCw size={15} />Görevleri yenile</button>
            </section>
          </aside>

          <section>
            <div className="mb-4 flex items-end justify-between"><div><p className="section-label">Koordinasyon panosu</p><h2 className="mt-1 text-xl font-black text-white">Canlı görev yaşam döngüsü</h2></div><p className="text-xs text-slate-500">{contractAddress ? "Yapılandırılan kontrat okunuyor" : "Etiketli demo örnekleri"}</p></div>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              <TaskColumn title="Açık" icon={<Clock3 size={16} className="text-orange-300" />} tasks={taskGroups.OPEN} selectedId={selectedTask?.id} onSelect={setSelectedTask} empty="Açık görev yok" />
              <TaskColumn title="Üstlenildi" icon={<UserCheck size={16} className="text-blue-300" />} tasks={taskGroups.CLAIMED} selectedId={selectedTask?.id} onSelect={setSelectedTask} empty="Üstlenilmiş görev yok" />
              <TaskColumn title="Doğrulama" icon={<ShieldCheck size={16} className="text-violet-300" />} tasks={taskGroups.REPORTED} selectedId={selectedTask?.id} onSelect={setSelectedTask} empty="Doğrulama bekleyen görev yok" />
              <TaskColumn title="Doğrulandı" icon={<BadgeCheck size={16} className="text-teal-300" />} tasks={taskGroups.VERIFIED} selectedId={selectedTask?.id} onSelect={setSelectedTask} empty="Doğrulanmış görev yok" />
            </div>
          </section>

          <aside className="panel h-fit p-5 xl:sticky xl:top-5">
            {selectedTask ? <>
              <div className="mb-5 flex items-start justify-between gap-3"><div><p className="section-label">Görev detayı</p><h2 className="mt-1 text-lg font-black text-white">Talep #{selectedTask.id}</h2></div><StatusPill status={selectedTask.status} /></div>
              {selectedTask.source === "demo-example" && <p className="mb-4 rounded-lg border border-blue-400/25 bg-blue-400/10 px-3 py-2 text-xs text-blue-200">Tohumlanmış demo örneği — zincir üstü görev değildir.</p>}
              <p className="text-sm leading-6 text-slate-200">{selectedTask.description}</p>
              <div className="my-5 space-y-3 border-y border-slate-700 py-4 text-xs">
                <div className="flex justify-between gap-3"><span className="text-slate-500">Alan</span><span className="text-right text-slate-200">{selectedTask.fictionalArea}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Oluşturan</span><span className="font-mono text-slate-200">{shortAddress(selectedTask.creator)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Gönüllü</span><span className="font-mono text-slate-200">{shortAddress(selectedTask.assignedVolunteer)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Doğrulamalar</span><span className="text-slate-200">{[selectedTask.verifierOne, selectedTask.verifierTwo].filter(Boolean).length} / 2</span></div>
              </div>
              <div className="space-y-2">
                {selectedTask.status === "OPEN" && <button className="button-primary w-full" onClick={() => void actOnTask(selectedTask, "Görevi üstlen")} disabled={selectedTask.source !== "onchain"}><UserCheck size={16} />Görevi üstlen</button>}
                {selectedTask.status === "CLAIMED" && <button className="button-primary w-full" onClick={() => void actOnTask(selectedTask, "Tamamlandı bildir")} disabled={selectedTask.source !== "onchain"}><CheckCircle2 size={16} />Tamamlandı bildir</button>}
                {selectedTask.status === "REPORTED" && <button className="button-primary w-full" onClick={() => void actOnTask(selectedTask, "Doğrulamayı kaydet")} disabled={selectedTask.source !== "onchain"}><ShieldCheck size={16} />Doğrulamayı kaydet</button>}
                {selectedTask.status === "VERIFIED" && <div className="flex items-center gap-2 rounded-xl border border-teal-400/30 bg-teal-400/10 p-3 text-sm font-bold text-teal-200"><BadgeCheck size={18} />Bağımsız olarak doğrulandı</div>}
              </div>
              <div className="mt-6"><p className="section-label">Bu oturumdaki işlemler</p>{selectedHistory.length ? <div className="mt-3 space-y-2">{selectedHistory.map((item) => <a key={item.hash} href={explorerUrl(item.hash)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg bg-slate-800 p-3 text-xs hover:bg-slate-700"><span><strong className="text-slate-200">{item.action}</strong><br /><span className="text-slate-500">{displayDate(item.createdAt)}</span></span><ArrowUpRight size={15} className="text-signal" /></a>)}</div> : <p className="mt-3 text-xs leading-5 text-slate-500">Bu görevin onaylanan işlemleri burada explorer bağlantılarıyla görünür.</p>}</div>
            </> : <div className="py-12 text-center text-sm text-slate-500"><ChevronRight className="mx-auto mb-3" />Detayları incelemek için bir görev seçin.</div>}
          </aside>
        </div>
      </div>
    </main>
  );
}
