export default function HellCalculatorTab() {
  return (
      <section className={'grid tab-panel dev-only'} id={'hellPanel'} hidden>
        <aside className={'panel'}>
          <h2>입력</h2>
          <div className={'form-grid'}>
            <div className={'field field-wide character-search-field'}>
              <label>캐릭터 검색</label>
              <div className={'loader-status dev-only'}>별도 이름 없이 이 컴퓨터 저장소에 자동 저장됩니다. 같은 브라우저/컴퓨터에서 다시 열면 유지됩니다.</div>
              <div className={'search-row'}>
                <select id={'serverIdInput'} defaultValue={'cain'}>
                  <option value={'cain'}>카인</option>
                  <option value={'diregie'}>디레지에</option>
                  <option value={'siroco'}>시로코</option>
                  <option value={'prey'}>프레이</option>
                  <option value={'casillas'}>카시야스</option>
                  <option value={'hilder'}>힐더</option>
                  <option value={'anton'}>안톤</option>
                  <option value={'bakal'}>바칼</option>
                </select>
                <input id={'characterNameInput'} type={'search'} placeholder={'캐릭터명'} autoComplete={'off'} enterKeyHint={'search'} />
                <button type={'button'} className={'ghost-button'} id={'addCharacterButton'}>추가</button>
                <button type={'button'} className={'ghost-button'} id={'refreshCharactersButton'}>전체 갱신</button>
                <button type={'button'} className={'ghost-button'} id={'clearCharactersButton'}>목록 초기화</button>
              </div>
              <div className={'loader-status'} id={'searchStatus'}>API 대기</div>
              <div className={'loader-status dev-only'}>
                파일로 열었다면
                <span className={'monospace-inline'}>python3 neople_hell_api_server.py</span>
                를 먼저 실행해 주세요.
              </div>
              <label htmlFor={'charactersJson'} className={'dev-only label-offset-top'}>자동 생성 결과 미리보기</label>
              <textarea id={'charactersJson'} readOnly className={'dev-only'} defaultValue={'[]'}></textarea>
              <div className={'error'} id={'error'}></div>
            </div>
            <div className={'slider-wrap'}>
              <div className={'slider-head'}>
                <div>
                  <div className={'percentile-section-label'} id={'percentileSectionLabel'}>상위</div>
                  <div className={'slider-value'}>
                    <span id={'percentileLabel'}>66</span>
                  </div>
                </div>
                <div className={'field field-narrow-number'}>
                  <label htmlFor={'percentileNumber'} id={'percentileNumberLabel'}>숫자 입력</label>
                  <input id={'percentileNumber'} type={'number'} min={'1'} max={'99'} step={'1'} defaultValue={'66'} />
                </div>
              </div>
              <input id={'percentileRange'} type={'range'} min={'1'} max={'99'} step={'1'} defaultValue={'66'} />
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'setCount'}>전체 세트 수</label>
              <input id={'setCount'} type={'number'} min={'1'} step={'1'} defaultValue={'12'} />
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'epicRate'}>에픽 드랍률(%)</label>
              <input id={'epicRate'} type={'number'} min={'0'} max={'100'} step={'0.001'} defaultValue={'2.1113'} />
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'taechoRate'}>태초 드랍률(%)</label>
              <input id={'taechoRate'} type={'number'} min={'0'} max={'100'} step={'0.001'} defaultValue={'0.2404'} />
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'hellPerRun'}>한판 계시량</label>
              <input id={'hellPerRun'} type={'number'} min={'0'} step={'0.001'} defaultValue={'44'} />
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'recoveryAmount'}>계시 회수량</label>
              <input id={'recoveryAmount'} type={'number'} min={'0'} step={'0.001'} defaultValue={'14.60'} />
              <button type={'button'} className={'ghost-button'} id={'applySupplyHellCalcButton'}>계시 관리 값 적용</button>
              <div className={'hell-calc-meta'} id={'supplyHellCalcMeta'}></div>
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'epicCraftCost'}>에픽 정가 비용</label>
              <input id={'epicCraftCost'} type={'number'} min={'0'} step={'1'} defaultValue={'9800'} />
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'taechoCraftCost'}>태초 정가 비용</label>
              <input id={'taechoCraftCost'} type={'number'} min={'0'} step={'1'} defaultValue={'45000'} />
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'trials'}>캐릭당 시뮬레이션 횟수</label>
              <input id={'trials'} type={'number'} min={'500'} step={'500'} defaultValue={'3000'} />
            </div>
            <div className={'field field-wide'}>
              <label htmlFor={'selectedCharacter'}>상세 보기 캐릭</label>
              <select id={'selectedCharacter'}></select>
            </div>
          </div>
        </aside>
        <main className={'stack'}>
          <section className={'panel section'}>
            <h2>전체 요약</h2>
            <div className={'cards'}>
              <div className={'card'}>
                <div className={'label'}>캐릭 수</div>
                <div className={'value'} id={'totalCharacters'}>-</div>
                <div className={'sub'}>현재 로드된 캐릭 수</div>
              </div>
              <div className={'card'}>
                <div className={'label'} id={'selectedPercentileCardLabel'}>상위</div>
                <div className={'value'} id={'selectedPercentileCard'}>-</div>
                <div className={'sub'}>전체 비교 기준</div>
              </div>
              <div className={'card'}>
                <div className={'label'}>계산 상태</div>
                <div className={'value card-value-compact'} id={'calcState'}>대기</div>
                <div className={'sub'} id={'calcMeta'}>-</div>
                <div className={'sub dev-only'} id={'calcMetaDev'}>-</div>
              </div>
              <div className={'card dev-only'}>
                <div className={'label'}>요약</div>
                <div className={'value card-value-compact'} id={'overviewSummary'}>-</div>
                <div className={'sub'}>헬 유지 / 경계 / 정가 우선 분포</div>
              </div>
            </div>
            <div className={'table-scroll table-scroll-overview'}>
              <table className={'overview-table'}>
                <thead>
                  <tr>
                    <th scope={'col'}>
                      <button type={'button'} className={'sort-button'} data-sort-key={'name'}>
                        <span>캐릭</span>
                        <span className={'sort-arrow'} aria-hidden={'true'}></span>
                      </button>
                    </th>
                    <th scope={'col'}>
                      <button type={'button'} className={'sort-button'} data-sort-key={'selectedHellCost'}>
                        <span>유효 세트 헬 비용</span>
                        <span className={'sort-arrow'} aria-hidden={'true'}></span>
                      </button>
                    </th>
                    <th scope={'col'}>
                      <button type={'button'} className={'sort-button'} data-sort-key={'craftCost'}>
                        <span>최저 정가 비용</span>
                        <span className={'sort-arrow'} aria-hidden={'true'}></span>
                      </button>
                    </th>
                    <th scope={'col'}>
                      <button type={'button'} className={'sort-button'} data-sort-key={'ratio'}>
                        <span>비율</span>
                        <span className={'sort-arrow'} aria-hidden={'true'}></span>
                      </button>
                    </th>
                    <th>판정</th>
                    <th>최저 정가 루트</th>
                    <th>삭제</th>
                  </tr>
                </thead>
              <tbody id={'overviewTableBody'}></tbody>
              </table>
            </div>
          </section>
          <section className={'panel section'}>
            <h2>선택 캐릭 상세</h2>
            <div className={'summary-box'}>
              <strong id={'detailTitle'}>-</strong>
              <div id={'detailSummary'}>-</div>
              <div id={'detailBadge'} className={'badge warn'}>대기</div>
            </div>
            <div className={'cards detail-summary-cards'}>
              <div className={'card'}>
                <div className={'label'}>유효 세트 헬 졸업 비용 (3태초+8에픽)</div>
                <div className={'value'} id={'selectedHellCost'}>-</div>
                <div className={'sub'} id={'selectedHellRuns'}>-</div>
              </div>
              <div className={'card'}>
                <div className={'label'}>최저 정가 비용</div>
                <div className={'value'} id={'craftCost'}>-</div>
                <div className={'sub'} id={'craftRoute'}>-</div>
              </div>
              <div className={'card'}>
                <div className={'label'}>분기 판정</div>
                <div className={'value card-value-compact'} id={'verdictText'}>-</div>
                <div className={'sub'} id={'verdictSub'}>-</div>
              </div>
              <div className={'card dev-only'}>
                <div className={'label'}>P50 / P66 / P80</div>
                <div className={'value card-value-compact'} id={'quantileCompact'}>-</div>
                <div className={'sub'}>유효 세트 중 1개 졸업 비용</div>
              </div>
            </div>
            <div className={'split'}>
              <div className={'panel dev-only panel-inner'}>
                <h2 className={'section-title-tight'}>고급 결과</h2>
                <div className={'cards detail-advanced-cards'}>
                  <div className={'card'}>
                    <div className={'label'}>P50</div>
                    <div className={'value'} id={'p50Cost'}>-</div>
                    <div className={'sub'} id={'p50Runs'}>-</div>
                  </div>
                  <div className={'card'}>
                    <div className={'label'}>P66</div>
                    <div className={'value'} id={'p66Cost'}>-</div>
                    <div className={'sub'} id={'p66Runs'}>-</div>
                  </div>
                  <div className={'card'}>
                    <div className={'label'}>P80</div>
                    <div className={'value'} id={'p80Cost'}>-</div>
                    <div className={'sub'} id={'p80Runs'}>-</div>
                  </div>
                  <div className={'card'}>
                    <div className={'label'}>Mean</div>
                    <div className={'value'} id={'meanCost'}>-</div>
                    <div className={'sub'} id={'meanRuns'}>-</div>
                  </div>
                </div>
              </div>
              <div className={'panel panel-inner'}>
                <h2 className={'section-title-tight'}>세트별 정가 결손 (3태초 + 8에픽 기준)</h2>
                <div className={'table-scroll table-scroll-set'}>
                  <table>
                    <thead>
                      <tr>
                        <th>유효 세트</th>
                        <th>현재 태초</th>
                        <th>현재 에픽</th>
                        <th>태초 결손</th>
                        <th>에픽 결손</th>
                        <th>정가 비용</th>
                      </tr>
                    </thead>
                    <tbody id={'setTableBody'}></tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className={'foot'}>
              목표는<strong>살아있는 세트 중 하나가 3태초 + 8에픽 완성</strong>
              상태가 되는 순간입니다.
              즉, 태초 3칸과 에픽 8칸을 별도 슬롯으로 보고 계산합니다.
              헬 1판 순원가는
              <strong>한판 계시량 - 회수 계시량</strong>
              으로 계산합니다.
            </div>
          </section>
        </main>
      </section>
  );
}
